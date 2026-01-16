import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Upload, X, Copy, Check, MousePointerClick, Download } from 'lucide-react';
import { CartItem, PaymentMethod, CustomField } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useImageUpload } from '../hooks/useImageUpload';
import { useOrders } from '../hooks/useOrders';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { supabase } from '../lib/supabase';
import OrderStatusModal from './OrderStatusModal';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  onBack: () => void;
  onNavigateToMenu?: () => void; // Callback to navigate to menu (e.g., after order succeeded)
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack, onNavigateToMenu }) => {
  const { paymentMethods } = usePaymentMethods();
  const { uploadImage, uploading: uploadingReceipt } = useImageUpload();
  const { createOrder } = useOrders();
  const { siteSettings } = useSiteSettings();
  const orderOption = siteSettings?.order_option || 'order_via_messenger';
  const [step, setStep] = useState<'details' | 'payment' | 'summary'>('details');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const paymentDetailsRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasCopiedMessage, setHasCopiedMessage] = useState(false);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);
  const [copiedAccountName, setCopiedAccountName] = useState(false);
  const [bulkInputValues, setBulkInputValues] = useState<Record<string, string>>({});
  const [bulkSelectedGames, setBulkSelectedGames] = useState<string[]>([]);
  const [useMultipleAccounts, setUseMultipleAccounts] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState<string | null>(null);
  const [invoiceNumberDate, setInvoiceNumberDate] = useState<string | null>(null); // Track the date when invoice was generated

  // Extract original menu item ID from cart item ID (format: "menuItemId:::CART:::timestamp-random")
  // This allows us to group all packages from the same game together
  const getOriginalMenuItemId = (cartItemId: string): string => {
    const parts = cartItemId.split(':::CART:::');
    return parts.length > 1 ? parts[0] : cartItemId;
  };

  // Group custom fields by item/game
  // If any game has custom fields, show those grouped by game. Otherwise, show default "IGN" field
  // Deduplicate by original menu item ID to avoid showing the same fields multiple times for the same game
  // (even if different packages/variations are selected)
  const itemsWithCustomFields = useMemo(() => {
    const itemsWithFields = cartItems.filter(item => item.customFields && item.customFields.length > 0);
    // Deduplicate by original menu item ID
    const uniqueItems = new Map<string, typeof cartItems[0]>();
    itemsWithFields.forEach(item => {
      const originalId = getOriginalMenuItemId(item.id);
      if (!uniqueItems.has(originalId)) {
        uniqueItems.set(originalId, item);
      }
    });
    return Array.from(uniqueItems.values());
  }, [cartItems]);

  const hasAnyCustomFields = itemsWithCustomFields.length > 0;

  // Detect if we can use multiple accounts (same game with different packages)
  const canUseMultipleAccounts = useMemo(() => {
    if (!hasAnyCustomFields) return false;
    
    // Group cart items by original menu item ID (game)
    const itemsByGame = new Map<string, typeof cartItems>();
    cartItems.forEach(item => {
      const originalId = getOriginalMenuItemId(item.id);
      if (!itemsByGame.has(originalId)) {
        itemsByGame.set(originalId, []);
      }
      itemsByGame.get(originalId)!.push(item);
    });
    
    // Check if any game has multiple different packages (variations)
    for (const [gameId, items] of itemsByGame.entries()) {
      const variations = new Set(items.map(item => item.selectedVariation?.id || 'none'));
      if (variations.size > 1) {
        return true; // Found a game with multiple different packages
      }
    }
    
    return false;
  }, [cartItems, hasAnyCustomFields]);

  // Get items grouped by game and variation for multiple accounts
  const itemsByGameAndVariation = useMemo(() => {
    if (!canUseMultipleAccounts) return [];
    
    const grouped = new Map<string, Map<string, typeof cartItems[0][]>>();
    
    cartItems.forEach(item => {
      const originalId = getOriginalMenuItemId(item.id);
      const variationId = item.selectedVariation?.id || 'none';
      
      if (!grouped.has(originalId)) {
        grouped.set(originalId, new Map());
      }
      const gameMap = grouped.get(originalId)!;
      
      if (!gameMap.has(variationId)) {
        gameMap.set(variationId, []);
      }
      gameMap.get(variationId)!.push(item);
    });
    
    // Convert to array format
    const result: Array<{
      gameId: string;
      gameName: string;
      variationId: string;
      variationName: string;
      items: typeof cartItems;
    }> = [];
    
    grouped.forEach((variations, gameId) => {
      const firstItem = cartItems.find(item => getOriginalMenuItemId(item.id) === gameId);
      if (!firstItem) return;
      
      variations.forEach((items, variationId) => {
        const variation = items[0].selectedVariation;
        result.push({
          gameId,
          gameName: firstItem.name,
          variationId,
          variationName: variation?.name || 'Default',
          items
        });
      });
    });
    
    return result;
  }, [cartItems, canUseMultipleAccounts]);

  // Get bulk input fields based on selected games - position-based
  // If selected games have N fields, show N bulk input fields
  const bulkInputFields = useMemo(() => {
    if (bulkSelectedGames.length === 0) return [];
    
    // Get all selected items (bulkSelectedGames contains original menu item IDs)
    const selectedItems = itemsWithCustomFields.filter(item => 
      bulkSelectedGames.includes(getOriginalMenuItemId(item.id))
    );
    
    if (selectedItems.length === 0) return [];
    
    // Find the maximum number of fields across all selected games
    const maxFields = Math.max(...selectedItems.map(item => item.customFields?.length || 0));
    
    if (maxFields === 0) return [];
    
    // Create fields array based on position (index)
    // Use the first selected item's fields as reference for labels
    const referenceItem = selectedItems[0];
    const fields: Array<{ index: number, field: CustomField | null }> = [];
    
    for (let i = 0; i < maxFields; i++) {
      // Try to get field from reference item, or use a placeholder
      const field = referenceItem.customFields?.[i] || null;
      fields.push({ index: i, field });
    }
    
    return fields;
  }, [bulkSelectedGames, itemsWithCustomFields]);

  // Sync bulk input values to selected games by position
  React.useEffect(() => {
    if (bulkSelectedGames.length === 0) return;
    
    const updates: Record<string, string> = {};
    
    // Get selected items (bulkSelectedGames contains original menu item IDs)
    const selectedItems = itemsWithCustomFields.filter(item => 
      bulkSelectedGames.includes(getOriginalMenuItemId(item.id))
    );
    
    // For each bulk input field (by index)
    Object.entries(bulkInputValues).forEach(([fieldIndexStr, value]) => {
      const fieldIndex = parseInt(fieldIndexStr, 10);
      
      // Apply to all selected games at the same field position
      selectedItems.forEach(item => {
        if (item.customFields && item.customFields[fieldIndex]) {
          const field = item.customFields[fieldIndex];
          const originalId = getOriginalMenuItemId(item.id);
          const valueKey = `${originalId}_${field.key}`;
          updates[valueKey] = value;
        }
      });
    });
    
    if (Object.keys(updates).length > 0) {
      setCustomFieldValues(prev => ({ ...prev, ...updates }));
    }
  }, [bulkInputValues, bulkSelectedGames, itemsWithCustomFields]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Auto-scroll to payment details when payment method is selected
  React.useEffect(() => {
    if (paymentMethod && paymentDetailsRef.current) {
      setShowScrollIndicator(true); // Reset to show indicator when payment method is selected
      setTimeout(() => {
        paymentDetailsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [paymentMethod]);

  // Check if buttons section is visible to hide scroll indicator
  React.useEffect(() => {
    if (!buttonsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If buttons are visible, hide the scroll indicator
          if (entry.isIntersecting) {
            setShowScrollIndicator(false);
          } else {
            setShowScrollIndicator(true);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '-50px 0px' // Add some margin to trigger earlier
      }
    );

    observer.observe(buttonsRef.current);

    return () => {
      observer.disconnect();
    };
  }, [step]);

  const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethod);
  
  const handleBulkInputChange = (fieldKey: string, value: string) => {
    setBulkInputValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleBulkGameSelectionChange = (itemId: string, checked: boolean) => {
    // itemId is the cart item ID, convert to original menu item ID
    const originalId = getOriginalMenuItemId(itemId);
    if (checked) {
      setBulkSelectedGames(prev => [...prev, originalId]);
    } else {
      setBulkSelectedGames(prev => prev.filter(id => id !== originalId));
    }
  };

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handleReceiptUpload = async (file: File) => {
    try {
      setReceiptError(null);
      setReceiptFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase
      const url = await uploadImage(file, 'payment-receipts');
      setReceiptImageUrl(url);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setReceiptError(error instanceof Error ? error.message : 'Failed to upload receipt');
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  };

  const handleReceiptRemove = () => {
    setReceiptFile(null);
    setReceiptImageUrl(null);
    setReceiptPreview(null);
    setReceiptError(null);
    setHasCopiedMessage(false); // Reset copy state when receipt is removed
    setGeneratedInvoiceNumber(null); // Reset invoice number when receipt is removed
    setInvoiceNumberDate(null); // Reset invoice date when receipt is removed
  };

  // Generate invoice number in format: 1M12D1 (month, day, order number)
  const generateInvoiceNumber = async (): Promise<string> => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const day = now.getDate(); // 1-31
      
      // Get start and end of today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      // Count orders created today
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
      
      if (error) {
        console.error('Error counting orders:', error);
        // Fallback: use timestamp-based number
        return `${month}M${day}D${Date.now().toString().slice(-3)}`;
      }
      
      // Order number is count + 1 (this will be the next order)
      const orderNumber = (count || 0) + 1;
      
      return `${month}M${day}D${orderNumber}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback format
      const now = new Date();
      return `${now.getMonth() + 1}M${now.getDate()}D${Date.now().toString().slice(-3)}`;
    }
  };

  // Generate and store invoice number (called when copy button is clicked)
  const generateAndStoreInvoiceNumber = async (): Promise<string> => {
    const today = new Date().toDateString(); // Get current date string
    
    // Check if invoice number exists and is from today
    if (generatedInvoiceNumber && invoiceNumberDate === today) {
      // Already generated for today, return stored value
      return generatedInvoiceNumber;
    }
    
    // Reset if it's a new day
    if (invoiceNumberDate !== today) {
      setGeneratedInvoiceNumber(null);
    }
    
    const invoiceNumber = await generateInvoiceNumber();
    setGeneratedInvoiceNumber(invoiceNumber);
    setInvoiceNumberDate(today); // Store the date when invoice was generated
    return invoiceNumber;
  };

  // Generate the order message text
  const generateOrderMessage = async (orderIdForMessage?: string | null, useStoredInvoice?: boolean): Promise<string> => {
    // Use stored invoice number if available, otherwise generate new one
    let invoiceDisplay: string;
    if (useStoredInvoice && generatedInvoiceNumber) {
      invoiceDisplay = generatedInvoiceNumber;
    } else if (useStoredInvoice) {
      // Generate and store if not yet generated
      invoiceDisplay = await generateAndStoreInvoiceNumber();
    } else {
      // Generate new invoice number (for messenger flow without copy)
      invoiceDisplay = await generateInvoiceNumber();
    }

    // Check if using multiple accounts
    const isMultipleAccounts = useMultipleAccounts && canUseMultipleAccounts && itemsByGameAndVariation.length > 0;
    
    // Check if using bulk input
    const isBulkInput = bulkSelectedGames.length > 0 && bulkInputValues && Object.keys(bulkInputValues).length > 0;

    // Get the game name (use first game if multiple, or single game name)
    const gameName = cartItems.length > 0 ? cartItems[0].name : '';

    // Build order message sections
    let messageSections: string[] = [];
    
    if (isMultipleAccounts) {
      // Multiple accounts mode: show game name once, then each item with ID & SERVER
      const firstItem = cartItems[0];
      const gameNameForMulti = firstItem.name;
      
      // Build sections for each order item (without repeating game name)
      cartItems.forEach((item, index) => {
        const gameId = getOriginalMenuItemId(item.id);
        const variationId = item.selectedVariation?.id || 'none';
        
        // Find matching account data
        const accountData = itemsByGameAndVariation.find(
          acc => acc.gameId === gameId && acc.variationId === variationId
        );
        
        // Get ID & SERVER for this package
        let idAndServer = '';
        if (accountData && accountData.items[0]?.customFields) {
          const firstItem = accountData.items[0];
          const allFieldValues: string[] = [];
          
          firstItem.customFields.forEach(field => {
            const valueKey = `${gameId}_${variationId}_${field.key}`;
            const value = customFieldValues[valueKey] || '';
            if (value) {
              allFieldValues.push(value);
            }
          });
          
          // Build ID & SERVER string
          if (allFieldValues.length === 1) {
            idAndServer = allFieldValues[0];
          } else if (allFieldValues.length >= 2) {
            idAndServer = allFieldValues.join(' & ');
          }
        }
        
        // Build section for this item
        const packageName = item.selectedVariation?.name || '';
        const orderLine = `ORDER: ${packageName} x${item.quantity} - ₱${item.totalPrice * item.quantity}`;
        
        // First item includes game name, subsequent items don't
        if (index === 0) {
          const section = `GAME: ${gameNameForMulti}
ID & SERVER: ${idAndServer || ''}
${orderLine}`;
          messageSections.push(section);
        } else {
          const section = `ID & SERVER: ${idAndServer || ''}
${orderLine}`;
          messageSections.push(section);
        }
      });
    } else {
      // Single account or bulk input mode: one section
      // Get ID & SERVER
      let idAndServerSection = '';
      
      if (isBulkInput) {
        // Get bulk input values for IGN/ID & SERVER
        const bulkValues: string[] = [];
        if (bulkInputFields.length > 0) {
          bulkInputFields.forEach(({ index }) => {
            const value = bulkInputValues[index.toString()] || '';
            if (value) {
              bulkValues.push(value);
            }
          });
        }
        
        if (bulkValues.length === 1) {
          idAndServerSection = bulkValues[0];
        } else if (bulkValues.length >= 2) {
          idAndServerSection = bulkValues.join(' & ');
        }
      } else {
        // Single account mode
        if (hasAnyCustomFields) {
          const allFieldValues: string[] = [];
          itemsWithCustomFields.forEach(item => {
            const originalId = getOriginalMenuItemId(item.id);
            item.customFields?.forEach(field => {
              const valueKey = `${originalId}_${field.key}`;
              const value = customFieldValues[valueKey] || '';
              if (value) {
                allFieldValues.push(value);
              }
            });
          });
          
          if (allFieldValues.length === 1) {
            idAndServerSection = allFieldValues[0];
          } else if (allFieldValues.length >= 2) {
            idAndServerSection = allFieldValues.join(' & ');
          }
        } else {
          // Default IGN field
          const defaultIgn = customFieldValues['default_ign'] || '';
          if (defaultIgn) {
            idAndServerSection = defaultIgn;
          }
        }
      }
      
      // Build order items (just package names)
      const orderLines = cartItems.map(item => {
        const packageName = item.selectedVariation?.name || item.name;
        return `ORDER: ${packageName} x${item.quantity} - ₱${item.totalPrice * item.quantity}`;
      });
      
      // Build single section
      const section = `GAME: ${gameName}
ID & SERVER: ${idAndServerSection || ''}
${orderLines.join('\n')}`;
      
      messageSections.push(section);
    }

    // Format the message according to the new structure
    // Join sections with single newline (no double breaks between items)
    let orderDetails = `INVOICE # ${invoiceDisplay}

${messageSections.join('\n')}

PAYMENT: ${selectedPaymentMethod?.name || 'N/A'}
TOTAL: ₱${totalPrice}

PAYMENT RECEIPT: ${receiptImageUrl || ''}`;

    return orderDetails;
  };

  const handleCopyMessage = async () => {
    try {
      // Generate and store invoice number when copy button is clicked
      await generateAndStoreInvoiceNumber();
      // Use stored invoice number for the message
      const message = await generateOrderMessage(orderId, true);
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setHasCopiedMessage(true); // Mark that copy button has been clicked
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleCopyAccountNumber = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccountNumber(true);
      setTimeout(() => setCopiedAccountNumber(false), 2000);
    } catch (error) {
      console.error('Failed to copy account number:', error);
    }
  };

  const handleCopyAccountName = async (accountName: string) => {
    try {
      await navigator.clipboard.writeText(accountName);
      setCopiedAccountName(true);
      setTimeout(() => setCopiedAccountName(false), 2000);
    } catch (error) {
      console.error('Failed to copy account name:', error);
    }
  };

  // Detect if we're in Messenger's in-app browser
  const isMessengerBrowser = useMemo(() => {
    return /FBAN|FBAV/i.test(navigator.userAgent) || 
           /FB_IAB/i.test(navigator.userAgent);
  }, []);

  const handleDownloadQRCode = async (qrCodeUrl: string | null | undefined, paymentMethodName: string) => {
    // Only disable in Messenger's in-app browser
    // All external browsers (Chrome, Safari, Firefox, Edge, etc.) should work
    if (isMessengerBrowser || !qrCodeUrl) {
      // In Messenger, downloads don't work - users can long-press the QR code image
      // Also return early if no QR code URL is provided
      return;
    }
    
    // For all external browsers, fetch and download as blob to force download
    // This approach works in Chrome, Safari, Firefox, Edge, Opera, and other modern browsers
    try {
      const response = await fetch(qrCodeUrl, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${paymentMethodName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.style.display = 'none';
      
      // Append to body, click, then remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try direct link with download attribute
      // This works in most browsers but may open instead of download in some cases
      try {
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = `qr-code-${paymentMethodName.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      setReceiptError('Please select a payment method');
      return;
    }
    
    if (!receiptImageUrl) {
      setReceiptError('Please upload your payment receipt before placing the order');
      return;
    }

    // Use stored invoice number if copy button was clicked, otherwise generate new one
    const orderDetails = await generateOrderMessage(orderId, generatedInvoiceNumber !== null);
    const encodedMessage = encodeURIComponent(orderDetails);
    const messengerUrl = `https://m.me/AmberKinGamerXtream?text=${encodedMessage}`;
    
    window.open(messengerUrl, '_blank');
    
  };

  const handlePlaceOrderDirect = async () => {
    if (!paymentMethod) {
      setReceiptError('Please select a payment method');
      return;
    }
    
    if (!receiptImageUrl) {
      setReceiptError('Please upload your payment receipt before placing the order');
      return;
    }

    setIsPlacingOrder(true);
    setReceiptError(null);

    try {
      // Build customer info object
      let customerInfo: Record<string, any> = {};
      
      // Add payment method
      if (selectedPaymentMethod) {
        customerInfo['Payment Method'] = selectedPaymentMethod.name;
      }

      // Handle multiple accounts mode
      if (useMultipleAccounts && canUseMultipleAccounts) {
        const multipleAccountsData: Array<{
          game: string;
          package: string;
          fields: Record<string, string>;
        }> = [];

        itemsByGameAndVariation.forEach(({ gameId, gameName, variationName, items }) => {
          const firstItem = items[0];
          if (!firstItem.customFields) return;

          const fields: Record<string, string> = {};
          firstItem.customFields.forEach(field => {
            // Use a key that includes gameId and variationId to differentiate
            const valueKey = `${gameId}_${items[0].selectedVariation?.id || 'none'}_${field.key}`;
            const value = customFieldValues[valueKey];
            if (value) {
              fields[field.label] = value;
            }
          });

          if (Object.keys(fields).length > 0) {
            multipleAccountsData.push({
              game: gameName,
              package: variationName,
              fields
            });
          }
        });

        if (multipleAccountsData.length > 0) {
          customerInfo['Multiple Accounts'] = multipleAccountsData;
        }
      } else {
        // Single account mode (default)
        if (hasAnyCustomFields) {
          itemsWithCustomFields.forEach((item) => {
            const originalId = getOriginalMenuItemId(item.id);
            item.customFields?.forEach(field => {
              const valueKey = `${originalId}_${field.key}`;
              const value = customFieldValues[valueKey];
              if (value) {
                customerInfo[field.label] = value;
              }
            });
          });
        } else {
          // Default IGN field
          if (customFieldValues['default_ign']) {
            customerInfo['IGN'] = customFieldValues['default_ign'];
          }
        }
      }

      // Create order
      const newOrder = await createOrder({
        order_items: cartItems,
        customer_info: customerInfo,
        payment_method_id: paymentMethod,
        receipt_url: receiptImageUrl,
        total_price: totalPrice,
      });

      if (newOrder) {
        setOrderId(newOrder.id);
        setIsOrderModalOpen(true);
        setGeneratedInvoiceNumber(null); // Reset invoice number after order is created
        setInvoiceNumberDate(null); // Reset invoice date after order is created
      } else {
        setReceiptError('Failed to create order. Please try again.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setReceiptError('Failed to create order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const isDetailsValid = useMemo(() => {
    if (!hasAnyCustomFields) {
      // Default IGN field
      return customFieldValues['default_ign']?.trim() || false;
    }
    
    if (useMultipleAccounts && canUseMultipleAccounts) {
      // Multiple accounts mode: check all required fields for each package
      return itemsByGameAndVariation.every(({ gameId, variationId, items }) => {
        const firstItem = items[0];
        if (!firstItem.customFields) return true;
        return firstItem.customFields.every(field => {
          if (!field.required) return true;
          const valueKey = `${gameId}_${variationId}_${field.key}`;
          return customFieldValues[valueKey]?.trim() || false;
        });
      });
    } else {
      // Single account mode: check all required fields for all items (use original menu item ID)
      return itemsWithCustomFields.every(item => {
        if (!item.customFields) return true;
        const originalId = getOriginalMenuItemId(item.id);
        return item.customFields.every(field => {
          if (!field.required) return true;
          const valueKey = `${originalId}_${field.key}`;
          return customFieldValues[valueKey]?.trim() || false;
        });
      });
    }
  }, [hasAnyCustomFields, itemsWithCustomFields, customFieldValues, useMultipleAccounts, canUseMultipleAccounts, itemsByGameAndVariation]);

  if (step === 'details') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8 relative">
          <button
            onClick={onBack}
            className="flex items-center text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200 absolute left-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-semibold text-cafe-text">Order Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Details Form */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-2xl font-medium text-cafe-text mb-6">Customer Information</h2>
            
            <form className="space-y-6">
              {/* Show count of items with custom fields */}
              {hasAnyCustomFields && itemsWithCustomFields.length > 0 && (
                <div className="mb-4 p-3 glass-strong border border-cafe-primary/30 rounded-lg">
                  <p className="text-sm text-cafe-text">
                    <span className="font-semibold text-cafe-primary">{itemsWithCustomFields.length}</span> game{itemsWithCustomFields.length > 1 ? 's' : ''} require{itemsWithCustomFields.length === 1 ? 's' : ''} additional information
                  </p>
                </div>
              )}

              {/* Bulk Input Section */}
              {itemsWithCustomFields.length >= 2 && (
                <div className="mb-6 p-4 glass-strong border border-cafe-primary/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-cafe-text mb-4">Bulk Input</h3>
                  <p className="text-sm text-cafe-textMuted mb-4">
                    Select games and fill fields once for all selected games.
                  </p>
                  
                  {/* Game Selection Checkboxes */}
                  <div className="space-y-2 mb-4">
                    {itemsWithCustomFields.map((item) => {
                      const originalId = getOriginalMenuItemId(item.id);
                      const isSelected = bulkSelectedGames.includes(originalId);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleBulkGameSelectionChange(item.id, e.target.checked)}
                            className="w-4 h-4 text-cafe-primary border-cafe-primary/30 rounded focus:ring-cafe-primary"
                          />
                          <span className="text-sm text-cafe-text">{item.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Input Fields - Only show if games are selected */}
                  {bulkSelectedGames.length > 0 && bulkInputFields.length > 0 && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-cafe-primary/20">
                      {bulkInputFields.map(({ index, field }) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-cafe-text mb-2">
                            {field ? field.label : `Field ${index + 1}`} <span className="text-cafe-textMuted">(Bulk)</span> {field?.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={bulkInputValues[index.toString()] || ''}
                            onChange={(e) => handleBulkInputChange(index.toString(), e.target.value)}
                            className="w-full px-4 py-3 glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                            placeholder={field?.placeholder || field?.label || `Field ${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Accounts Toggle */}
              {canUseMultipleAccounts && (
                <div className="mb-6 p-4 glass-strong border border-cafe-primary/30 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useMultipleAccounts}
                      onChange={(e) => setUseMultipleAccounts(e.target.checked)}
                      className="w-5 h-5 text-cafe-primary border-cafe-primary/30 rounded focus:ring-cafe-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-cafe-text">Multiple Accounts</p>
                      <p className="text-xs text-cafe-textMuted">Enable if you need separate account information for different packages of the same game</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Dynamic Custom Fields grouped by game */}
              {hasAnyCustomFields ? (
                useMultipleAccounts && canUseMultipleAccounts ? (
                  // Multiple accounts mode: show fields for each package
                  itemsByGameAndVariation.map(({ gameId, gameName, variationId, variationName, items }) => {
                    const firstItem = items[0];
                    if (!firstItem.customFields) return null;

                    return (
                      <div key={`${gameId}_${variationId}`} className="space-y-4 pb-6 border-b border-cafe-primary/20 last:border-b-0 last:pb-0">
                        <div className="mb-4 flex items-center gap-4">
                          {/* Game Icon */}
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg">
                            {firstItem.image ? (
                              <img
                                src={firstItem.image}
                                alt={gameName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${firstItem.image ? 'hidden' : ''}`}>
                              <div className="text-2xl opacity-20 text-gray-400">🎮</div>
                            </div>
                          </div>
                          
                          {/* Game Title and Description */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-cafe-text">{gameName}</h3>
                            <p className="text-sm text-cafe-textMuted">Package: {variationName}</p>
                            <p className="text-xs text-cafe-textMuted">Please provide the following information for this package</p>
                          </div>
                        </div>
                        {firstItem.customFields.map((field) => {
                          const valueKey = `${gameId}_${variationId}_${field.key}`;
                          return (
                            <div key={valueKey}>
                              <label className="block text-sm font-medium text-cafe-text mb-2">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type="text"
                                value={customFieldValues[valueKey] || ''}
                                onChange={(e) => setCustomFieldValues({
                                  ...customFieldValues,
                                  [valueKey]: e.target.value
                                })}
                                className="w-full px-4 py-3 glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                                placeholder={field.placeholder || field.label}
                                required={field.required}
                                disabled={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  // Single account mode (default)
                  itemsWithCustomFields.map((item) => {
                    const originalId = getOriginalMenuItemId(item.id);
                    return (
                      <div key={item.id} className="space-y-4 pb-6 border-b border-cafe-primary/20 last:border-b-0 last:pb-0">
                        <div className="mb-4 flex items-center gap-4">
                          {/* Game Icon */}
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                              <div className="text-2xl opacity-20 text-gray-400">🎮</div>
                            </div>
                          </div>
                          
                          {/* Game Title and Description */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-cafe-text">{item.name}</h3>
                            <p className="text-sm text-cafe-textMuted">Please provide the following information for this game</p>
                          </div>
                        </div>
                        {item.customFields?.map((field) => {
                          const valueKey = `${originalId}_${field.key}`;
                          return (
                            <div key={valueKey}>
                              <label className="block text-sm font-medium text-cafe-text mb-2">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type="text"
                                value={customFieldValues[valueKey] || ''}
                                onChange={(e) => setCustomFieldValues({
                                  ...customFieldValues,
                                  [valueKey]: e.target.value
                                })}
                                className="w-full px-4 py-3 glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                                placeholder={field.placeholder || field.label}
                                required={field.required}
                                disabled={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )
              ) : (
                <div>
                  <label className="block text-sm font-medium text-cafe-text mb-2">
                    IGN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customFieldValues['default_ign'] || ''}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      ['default_ign']: e.target.value
                    })}
                    className="w-full px-4 py-3 glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                    placeholder="In game name"
                    required
                  />
                </div>
              )}

              <button
                onClick={handleProceedToPayment}
                disabled={!isDetailsValid}
                className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${
                  isDetailsValid
                    ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                    : 'glass text-cafe-textMuted cursor-not-allowed'
                }`}
                style={isDetailsValid ? { backgroundColor: '#1E7ACB' } : {}}
              >
                Proceed to Payment
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-2xl font-medium text-cafe-text mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start gap-4 py-3 border-b border-cafe-primary/30">
                  {/* Game Icon */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                      <div className="text-2xl opacity-20 text-gray-400">🎮</div>
                    </div>
                  </div>
                  
                  {/* Game Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-cafe-text mb-1">{item.name}</h4>
                    {item.selectedVariation && (
                      <p className="text-sm text-cafe-textMuted">Package: {item.selectedVariation.name}</p>
                    )}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <p className="text-sm text-cafe-textMuted">
                        Add-ons: {item.selectedAddOns.map(addOn => addOn.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-cafe-textMuted mt-1">₱{item.totalPrice} × {item.quantity}</p>
                  </div>
                  
                  {/* Price */}
                  <div className="flex-shrink-0">
                  <span className="font-semibold text-cafe-text">₱{item.totalPrice * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-cafe-primary/30 pt-4">
              <div className="flex items-center justify-between text-2xl font-semibold text-cafe-text">
                <span>Total:</span>
                <span className="text-white">₱{totalPrice}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  if (step === 'payment') {
    return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center mb-8 relative">
        <button
          onClick={() => setStep('details')}
          className="flex items-center text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200 absolute left-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-semibold text-cafe-text">Payment</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Payment Method Selection */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-2xl font-medium text-cafe-text mb-6">Choose Payment Method</h2>
          
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(method.id as PaymentMethod);
                }}
                className={`p-2 md:p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  paymentMethod === method.id
                    ? 'border-transparent text-white'
                    : 'glass border-cafe-primary/30 text-cafe-text hover:border-cafe-primary hover:glass-strong'
                }`}
                style={paymentMethod === method.id ? { backgroundColor: '#1E7ACB' } : {}}
              >
                {/* Icon on Top */}
                <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg flex items-center justify-center">
                  <span className="text-xl md:text-2xl">💳</span>
                </div>
                {/* Text Below */}
                <span className="font-medium text-xs md:text-sm text-center">{method.name}</span>
              </button>
            ))}
          </div>

          {/* Payment Details with QR Code */}
          {selectedPaymentMethod && (
            <div 
              ref={paymentDetailsRef}
              className="glass-strong rounded-lg p-6 mb-6 border border-cafe-primary/30"
            >
              <h3 className="font-medium text-cafe-text mb-4">Payment Details</h3>
              <div className="space-y-4">
                {/* Payment Method Name */}
                <div>
                  <p className="text-lg font-semibold text-cafe-text">{selectedPaymentMethod.name}</p>
                </div>
                
                {/* Account Name with Copy Button */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-cafe-textMuted">Account Name:</p>
                    <button
                      onClick={() => handleCopyAccountName(selectedPaymentMethod.account_name)}
                      className="px-3 py-1.5 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200 flex-shrink-0 text-sm font-medium"
                      title="Copy account name"
                    >
                      {copiedAccountName ? (
                        <span className="text-green-400">Copied!</span>
                      ) : (
                        <span className="text-cafe-text">Copy</span>
                      )}
                    </button>
                  </div>
                  <p className="text-cafe-text font-medium">{selectedPaymentMethod.account_name}</p>
                </div>
                
                {/* Other Option */}
                <div>
                  <h3 className="font-medium text-cafe-text text-center">Other Option</h3>
                </div>
                
                {/* Download QR Button and QR Image */}
                {selectedPaymentMethod.qr_code_url ? (
                <div className="flex flex-col items-center gap-3">
                  {!isMessengerBrowser && (
                    <button
                      onClick={() => handleDownloadQRCode(selectedPaymentMethod.qr_code_url, selectedPaymentMethod.name)}
                      className="px-3 py-1.5 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200 text-sm font-medium text-cafe-text flex items-center gap-2"
                      title="Download QR code"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download QR</span>
                    </button>
                  )}
                  {isMessengerBrowser && (
                    <p className="text-xs text-cafe-textMuted text-center">Long-press the QR code to save</p>
                  )}
                  <img 
                    src={selectedPaymentMethod.qr_code_url} 
                    alt={`${selectedPaymentMethod.name} QR Code`}
                    className="w-32 h-32 rounded-lg border-2 border-cafe-primary/30 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
                    }}
                  />
                </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-lg border-2 border-cafe-primary/30 shadow-sm bg-cafe-darkCard flex items-center justify-center">
                      <p className="text-xs text-cafe-textMuted text-center">No QR Code Available</p>
                    </div>
                  </div>
                )}
                
                {/* Account Number with Copy Button */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-cafe-textMuted">Account Number:</p>
                    <button
                      onClick={() => handleCopyAccountNumber(selectedPaymentMethod.account_number)}
                      className="px-3 py-1.5 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200 flex-shrink-0 text-sm font-medium"
                      title="Copy account number"
                    >
                      {copiedAccountNumber ? (
                        <span className="text-green-400">Copied!</span>
                      ) : (
                        <span className="text-cafe-text">Copy</span>
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-cafe-text font-medium text-xl md:text-2xl">{selectedPaymentMethod.account_number}</p>
                </div>
                
                {/* Amount and Instructions */}
                <div className="pt-2 border-t border-cafe-primary/20">
                  <p className="text-xl font-semibold text-white mb-2">Amount: ₱{totalPrice}</p>
                  <p className="text-sm text-cafe-textMuted">Press the copy button to copy the number or download the QR code, make a payment, then proceed to the next page to upload your receipt.</p>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={() => setStep('summary')}
            disabled={!paymentMethod}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform mb-6 ${
              paymentMethod
                ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                : 'glass text-cafe-textMuted cursor-not-allowed'
            }`}
            style={paymentMethod ? { backgroundColor: '#1E7ACB' } : {}}
          >
            Confirm
          </button>

          {/* Payment instructions */}
          <div className="glass border border-cafe-primary/30 rounded-lg p-4">
            <h4 className="font-medium text-cafe-text mb-2">📸 Payment Proof Required</h4>
            <p className="text-sm text-cafe-textMuted">
              After making your payment, please upload a screenshot of your payment receipt on the next page. This helps us verify and process your order quickly.
            </p>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // Summary Step - Final Order Summary
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center mb-8 relative">
        <button
          onClick={() => setStep('payment')}
          className="flex items-center text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200 absolute left-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-semibold text-cafe-text">Order</h1>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="space-y-4 mb-6">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-start gap-4 py-3 border-b border-cafe-primary/30">
              {/* Game Icon */}
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                  <div className="text-2xl opacity-20 text-gray-400">🎮</div>
                </div>
              </div>
              
              {/* Game Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-cafe-text mb-1">{item.name}</h4>
                {item.selectedVariation && (
                  <p className="text-sm text-cafe-textMuted">Package: {item.selectedVariation.name}</p>
                )}
                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                  <p className="text-sm text-cafe-textMuted">
                    Add-ons: {item.selectedAddOns.map(addOn => 
                      addOn.quantity && addOn.quantity > 1 
                        ? `${addOn.name} x${addOn.quantity}`
                        : addOn.name
                    ).join(', ')}
                  </p>
                )}
                <p className="text-sm text-cafe-textMuted mt-1">₱{item.totalPrice} × {item.quantity}</p>
              </div>
              
              {/* Price */}
              <div className="flex-shrink-0">
                <span className="font-semibold text-cafe-text">₱{item.totalPrice * item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 mb-6">
          <div className="flex items-center justify-between text-2xl font-semibold text-cafe-text">
            <span>Total:</span>
            <span className="text-white">₱{totalPrice}</span>
          </div>
        </div>

        {/* Customer Information Display */}
        <div className="mb-6">
          <h4 className="font-medium text-cafe-text mb-2">Customer Information</h4>
          <div className="space-y-1">
            {selectedPaymentMethod && (
              <p className="text-sm text-cafe-textMuted">Payment Method: {selectedPaymentMethod.name}</p>
            )}
            {hasAnyCustomFields ? (
              itemsWithCustomFields.map((item) => {
                const originalId = getOriginalMenuItemId(item.id);
                const fields = item.customFields?.map(field => {
                  const valueKey = `${originalId}_${field.key}`;
                  const value = customFieldValues[valueKey];
                  return value ? (
                    <p key={valueKey} className="text-sm text-cafe-textMuted">
                      {field.label}: {value}
                    </p>
                  ) : null;
                }).filter(Boolean);
                
                return fields && fields.length > 0 ? fields : null;
              })
            ) : (
              customFieldValues['default_ign'] && (
                <p className="text-sm text-cafe-textMuted">
                  IGN: {customFieldValues['default_ign']}
                </p>
              )
            )}
          </div>
        </div>

        {/* Receipt Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-cafe-text mb-2">
            Payment Receipt <span className="text-red-400">*</span>
          </label>
          
          {!receiptPreview ? (
            <div className="relative glass border-2 border-dashed border-cafe-primary/30 rounded-lg p-6 text-center hover:border-cafe-primary transition-colors duration-200">
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-cafe-primary text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleReceiptUpload(file);
                  }
                }}
                className="hidden"
                id="receipt-upload"
                disabled={uploadingReceipt}
              />
              <label
                htmlFor="receipt-upload"
                className={`cursor-pointer flex flex-col items-center space-y-2 ${uploadingReceipt ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingReceipt ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cafe-primary"></div>
                    <span className="text-sm text-cafe-textMuted">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-cafe-primary" />
                    <span className="text-sm text-cafe-text">Click to upload receipt</span>
                    <span className="text-xs text-cafe-textMuted">JPEG, PNG, WebP, or GIF (Max 5MB)</span>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="relative glass border border-cafe-primary/30 rounded-lg p-4">
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-cafe-primary text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-20 h-20 object-cover rounded-lg border border-cafe-primary/30"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cafe-text truncate">
                    {receiptFile?.name || 'Receipt uploaded'}
                  </p>
                  <p className="text-xs text-cafe-textMuted">
                    {receiptImageUrl ? '✓ Uploaded successfully' : 'Uploading...'}
                  </p>
                </div>
                <button
                  onClick={handleReceiptRemove}
                  className="flex-shrink-0 p-2 glass-strong rounded-lg hover:bg-red-500/20 transition-colors duration-200"
                  disabled={uploadingReceipt}
                >
                  <X className="h-4 w-4 text-cafe-text" />
                </button>
              </div>
            </div>
          )}

          {receiptError && (
            <p className="mt-2 text-sm text-red-400">{receiptError}</p>
          )}
        </div>

        <div ref={buttonsRef}>
          {orderOption === 'order_via_messenger' ? (
            <>
              {/* Copy button - must be clicked before placing order */}
              <button
                onClick={handleCopyMessage}
                disabled={uploadingReceipt || !paymentMethod || !receiptImageUrl}
                className={`relative w-full py-3 rounded-xl font-medium transition-all duration-200 transform mb-3 flex items-center justify-center space-x-2 ${
                  !uploadingReceipt && paymentMethod && receiptImageUrl
                    ? 'glass border border-cafe-primary/30 text-cafe-text hover:border-cafe-primary hover:glass-strong'
                    : 'glass border border-cafe-primary/20 text-cafe-textMuted cursor-not-allowed'
                }`}
              >
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  !uploadingReceipt && paymentMethod && receiptImageUrl
                    ? 'bg-cafe-primary text-white'
                    : 'bg-cafe-textMuted/30 text-cafe-textMuted'
                }`}>
                  2
                </div>
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy Order Message</span>
                  </>
                )}
              </button>

              {/* Place Order button - requires payment method, receipt, and copy button to be clicked */}
              <button
                onClick={handlePlaceOrder}
                disabled={!paymentMethod || !receiptImageUrl || uploadingReceipt || !hasCopiedMessage}
                className={`relative w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${
                  paymentMethod && receiptImageUrl && !uploadingReceipt && hasCopiedMessage
                    ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                    : 'glass text-cafe-textMuted cursor-not-allowed'
                }`}
                style={paymentMethod && receiptImageUrl && !uploadingReceipt && hasCopiedMessage ? { backgroundColor: '#1E7ACB' } : {}}
              >
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  paymentMethod && receiptImageUrl && !uploadingReceipt && hasCopiedMessage
                    ? 'bg-cafe-primary text-white'
                    : 'bg-cafe-textMuted/30 text-cafe-textMuted'
                }`}>
                  3
                </div>
                {uploadingReceipt ? 'Uploading Receipt...' : 'Order via Messenger'}
              </button>
              
              <p className="text-xs text-cafe-textMuted text-center mt-3">
                You'll be redirected to Facebook Messenger to confirm your order. Your receipt has been uploaded and will be included in the message.
              </p>
            </>
          ) : (
            <>
              {/* Place Order button - for place_order option */}
              <button
                onClick={handlePlaceOrderDirect}
                disabled={!paymentMethod || !receiptImageUrl || uploadingReceipt || isPlacingOrder}
                className={`relative w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${
                  paymentMethod && receiptImageUrl && !uploadingReceipt && !isPlacingOrder
                    ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                    : 'glass text-cafe-textMuted cursor-not-allowed'
                }`}
                style={paymentMethod && receiptImageUrl && !uploadingReceipt && !isPlacingOrder ? { backgroundColor: '#1E7ACB' } : {}}
              >
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  paymentMethod && receiptImageUrl && !uploadingReceipt && !isPlacingOrder
                    ? 'bg-cafe-primary text-white'
                    : 'bg-cafe-textMuted/30 text-cafe-textMuted'
                }`}>
                  2
                </div>
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Order Status Modal */}
      <OrderStatusModal
        orderId={orderId}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSucceededClose={onNavigateToMenu}
      />
    </div>
  );
};

export default Checkout;
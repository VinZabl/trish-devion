import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { MenuItem, Variation } from '../types';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity?: number, variation?: Variation) => void;
  quantity: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onItemAdded?: () => void; // Callback when item is added to cart
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  onAddToCart, 
  quantity, 
  onUpdateQuantity,
  onItemAdded
}) => {
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(
    item.variations?.[0]
  );
  const nameRef = useRef<HTMLHeadingElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  // Calculate discounted price for a variation/currency package
  const getDiscountedPrice = (basePrice: number): number => {
    if (item.isOnDiscount && item.discountPercentage !== undefined) {
      const discountAmount = (basePrice * item.discountPercentage) / 100;
      return basePrice - discountAmount;
    }
    return basePrice;
  };

  const handleCardClick = () => {
    if (!item.available) return;
    setShowCustomization(true);
  };

  const handleItemSelect = (variation?: Variation) => {
    onAddToCart(item, 1, variation || selectedVariation);
    setShowCustomization(false);
    setSelectedVariation(item.variations?.[0]);
    // Call the callback to redirect to cart after adding item
    if (onItemAdded) {
      onItemAdded();
    }
  };

  // Check if text overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      if (!nameRef.current) return;
      
      const element = nameRef.current;
      const isOverflowing = element.scrollWidth > element.clientWidth;
      setShouldScroll(isOverflowing);
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      checkOverflow();
    }, 100);

    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [item.name]);

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`relative flex flex-row items-center transition-all duration-300 group rounded-xl p-2.5 md:p-3 gap-2 md:gap-3 ${!item.available ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          background: '#1E7ACB',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minHeight: '80px'
        }}
        onMouseEnter={(e) => {
          if (item.available) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.backdropFilter = 'blur(16px)';
            e.currentTarget.style.webkitBackdropFilter = 'blur(16px)';
            e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
          }
        }}
        onMouseLeave={(e) => {
          if (item.available) {
            e.currentTarget.style.background = '#1E7ACB';
            e.currentTarget.style.backdropFilter = 'none';
            e.currentTarget.style.webkitBackdropFilter = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        {/* Close Text Overlay for unavailable items */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl z-10">
            <span className="text-white font-bold text-lg sm:text-xl opacity-90">Close</span>
          </div>
        )}
        {/* Square Game Icon on Left */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-cafe-darkCard to-cafe-darkBg transition-transform duration-300 group-hover:scale-105">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
            <div className="text-4xl opacity-20 text-gray-400">🎮</div>
          </div>
        </div>
        
        {/* Game Name and Info on Right */}
        <div className="flex-1 overflow-hidden min-w-0">
          <h4 
            ref={nameRef}
            className={`text-white font-bold whitespace-nowrap text-base sm:text-lg mb-1 ${
              shouldScroll ? 'animate-scroll-text' : ''
            }`}
            style={shouldScroll ? {
              display: 'inline-block',
            } : {}}
          >
            {shouldScroll ? (
              <>
                <span>{item.name}</span>
                <span className="mx-4">•</span>
                <span>{item.name}</span>
              </>
            ) : (
              item.name
            )}
          </h4>
          {item.subtitle && (
            <p className="text-xs sm:text-sm text-gray-300">
              {item.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Item Selection Modal */}
      {showCustomization && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCustomization(false)}>
          <div className="flex flex-col rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden" style={{ background: '#0066CC' }} onClick={(e) => e.stopPropagation()}>
            <div 
              className="flex-shrink-0 p-6 flex items-start justify-between rounded-t-2xl relative overflow-hidden" 
              style={{ 
                backgroundImage: item.image ? `url(${item.image})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                minHeight: '120px'
              }}
            >
              {/* Dark overlay for text readability - covers entire header including edges */}
              <div 
                className="absolute inset-0 bg-black/60 rounded-t-2xl"
                style={{
                  zIndex: 1,
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0
                }}
              />
              
              {/* Border on top of overlay */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 rounded-b-2xl"
                style={{
                  zIndex: 2
                }}
              />
              
              {/* Content with relative positioning to be above overlay */}
              <div className="relative z-10 flex items-start justify-between w-full gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white drop-shadow-lg">{item.name}</h3>
                {item.subtitle && (
                    <p className="text-sm text-white/95 mt-1 drop-shadow-md">{item.subtitle}</p>
                )}
                {item.description && (
                    <p className="text-sm text-white/90 mt-2 drop-shadow-md whitespace-pre-line break-words">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => setShowCustomization(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200 relative z-10 flex-shrink-0"
              >
                  <X className="h-5 w-5 text-white drop-shadow-lg" />
              </button>
              </div>
            </div>

            <div 
              className="flex-1 overflow-y-auto min-h-0 relative" 
              style={{ 
                background: '#0066CC',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {/* Fade-out gradient overlay at top - items fade as they approach header */}
              <div
                className="sticky top-0 left-0 right-0 z-10 pointer-events-none"
                style={{
                  height: '32px',
                  background: 'linear-gradient(to bottom, #0066CC 0%, rgba(0, 102, 204, 0.98) 20%, rgba(0, 102, 204, 0.7) 50%, rgba(0, 102, 204, 0.2) 80%, transparent 100%)',
                  marginBottom: '-32px'
                }}
              />
              
              <div className="p-6 pt-4">
                {/* Show currency packages grouped by category */}
                {item.variations && item.variations.length > 0 ? (
                  (() => {
                    // Group variations by category and track category sort order
                    const groupedByCategory: Record<string, { variations: Variation[], categorySort: number }> = {};
                    item.variations.forEach((variation) => {
                      const category = variation.category || 'Uncategorized';
                      const categorySort = variation.sort !== null && variation.sort !== undefined ? variation.sort : 999;
                      
                      if (!groupedByCategory[category]) {
                        groupedByCategory[category] = { variations: [], categorySort: 999 };
                      }
                      groupedByCategory[category].variations.push(variation);
                      // Use the minimum sort value as the category sort order
                      if (categorySort < groupedByCategory[category].categorySort) {
                        groupedByCategory[category].categorySort = categorySort;
                      }
                    });

                    // Sort categories by category sort order (sort field), then alphabetically
                    const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
                      const sortA = groupedByCategory[a].categorySort;
                      const sortB = groupedByCategory[b].categorySort;
                      if (sortA !== sortB) {
                        return sortA - sortB;
                      }
                      return a.localeCompare(b);
                    });

                    // Sort variations within each category by sort_order, then by price
                    sortedCategories.forEach((category) => {
                      groupedByCategory[category].variations.sort((a, b) => {
                        const sortOrderA = a.sort_order || 0;
                        const sortOrderB = b.sort_order || 0;
                        if (sortOrderA !== sortOrderB) {
                          return sortOrderA - sortOrderB;
                        }
                        return a.price - b.price;
                      });
                    });

                    return (
                      <div className="space-y-6">
                        {sortedCategories.map((category, categoryIndex) => (
                          <div key={category}>
                            {/* Category Header */}
                            <h4 className="text-lg font-bold text-white mb-3 font-anton italic">{category}</h4>
                            
                            {/* Packages Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              {groupedByCategory[category].variations.map((variation) => {
                                const originalPrice = variation.price;
                                const discountedPrice = getDiscountedPrice(originalPrice);
                                const isDiscounted = item.isOnDiscount && item.discountPercentage !== undefined;
                                
                                return (
                                  <button
                                    key={variation.id}
                                    onClick={() => handleItemSelect(variation)}
                                    className="bg-white rounded-lg p-3 text-left group shadow-md relative overflow-hidden package-card-hover"
                                    style={{
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <div className="font-semibold text-gray-900 text-sm mb-1">
                                        {variation.name}
                                      </div>
                                      {variation.description && (
                                        <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                                          {variation.description}
                                        </div>
                                      )}
                                      <div className="mt-auto">
                                        <div className="text-base font-bold text-gray-900">
                                          ₱{discountedPrice.toFixed(2)}
                                        </div>
                                        {isDiscounted && (
                                          <div className="flex items-center gap-2 mt-1">
                                            <div className="text-xs text-gray-500 line-through">
                                              ₱{originalPrice.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-900 font-semibold">
                                              -{item.discountPercentage}%
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Divider between categories */}
                            {categoryIndex < sortedCategories.length - 1 && (
                              <div className="border-t border-white/20 my-4"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8 text-white/80">
                    No currency packages available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemCard;
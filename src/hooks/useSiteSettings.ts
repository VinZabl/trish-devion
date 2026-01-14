import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SiteSettings, SiteSetting } from '../types';

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSiteSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('id');

      if (error) throw error;

      // Transform the data into a more usable format
      const orderOptionValue = data.find(s => s.id === 'order_option')?.value || 'order_via_messenger';
      const settings: SiteSettings = {
        site_name: data.find(s => s.id === 'site_name')?.value || 'AmberKin x GamerXtream',
        site_logo: data.find(s => s.id === 'site_logo')?.value || '/logo.png',
        site_description: data.find(s => s.id === 'site_description')?.value || 'Welcome to AmberKin x GamerXtream — Your perfect game credits destination',
        currency: data.find(s => s.id === 'currency')?.value || '₱',
        currency_code: data.find(s => s.id === 'currency_code')?.value || 'PHP',
        footer_social_1: data.find(s => s.id === 'footer_social_1')?.value || '',
        footer_social_2: data.find(s => s.id === 'footer_social_2')?.value || '',
        footer_social_3: data.find(s => s.id === 'footer_social_3')?.value || '',
        footer_social_4: data.find(s => s.id === 'footer_social_4')?.value || '',
        footer_support_url: data.find(s => s.id === 'footer_support_url')?.value || '',
        order_option: (orderOptionValue === 'place_order' ? 'place_order' : 'order_via_messenger') as 'order_via_messenger' | 'place_order'
      };

      setSiteSettings(settings);
    } catch (err) {
      console.error('Error fetching site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch site settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSiteSetting = async (id: string, value: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('id', id);

      if (error) throw error;

      // Refresh the settings
      await fetchSiteSettings();
    } catch (err) {
      console.error('Error updating site setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site setting');
      throw err;
    }
  };

  const updateSiteSettings = async (updates: Partial<SiteSettings>) => {
    try {
      setError(null);

      const updatePromises = Object.entries(updates).map(([key, value]) =>
        supabase
          .from('site_settings')
          .update({ value })
          .eq('id', key)
      );

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Some updates failed');
      }

      // Refresh the settings
      await fetchSiteSettings();
    } catch (err) {
      console.error('Error updating site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site settings');
      throw err;
    }
  };

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  return {
    siteSettings,
    loading,
    error,
    updateSiteSetting,
    updateSiteSettings,
    refetch: fetchSiteSettings
  };
};

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member, CreateMemberData, LoginMemberData } from '../types';

// Simple hash function (for production, use a proper hashing library)
const hashPassword = async (password: string): Promise<string> => {
  // Using Web Crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

export const useMemberAuth = () => {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if member is logged in
    const checkAuth = async () => {
      const memberId = localStorage.getItem('member_id');
      if (memberId) {
        try {
          const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', memberId)
            .eq('status', 'active')
            .single();

          if (!error && data) {
            setCurrentMember(data as Member);
          } else {
            // Only remove if there's an actual error or member is inactive
            localStorage.removeItem('member_id');
            setCurrentMember(null);
          }
        } catch (err) {
          console.error('Error checking auth:', err);
          localStorage.removeItem('member_id');
          setCurrentMember(null);
        }
      } else {
        // No member_id in localStorage, ensure currentMember is null
        setCurrentMember(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for storage events (when localStorage is updated from another tab/component)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event to trigger re-check from same window
    window.addEventListener('memberAuthUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('memberAuthUpdate', handleStorageChange);
    };
  }, []);

  const register = async (data: CreateMemberData): Promise<{ success: boolean; error?: string; member?: Member }> => {
    try {
      // Check if email or username already exists
      const { data: existingEmail } = await supabase
        .from('members')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingEmail) {
        return { success: false, error: 'Email already registered' };
      }

      const { data: existingUsername } = await supabase
        .from('members')
        .select('id')
        .eq('username', data.username)
        .single();

      if (existingUsername) {
        return { success: false, error: 'Username already taken' };
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Insert member
      const { data: newMember, error } = await supabase
        .from('members')
        .insert({
          username: data.username,
          email: data.email,
          mobile_no: data.mobile_no || null,
          password_hash: passwordHash,
          level: 1,
          status: 'active',
          user_type: 'end_user'
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (newMember) {
        localStorage.setItem('member_id', newMember.id);
        setCurrentMember(newMember as Member);
        // Dispatch custom event to notify other instances
        window.dispatchEvent(new CustomEvent('memberAuthUpdate'));
        return { success: true, member: newMember as Member };
      }

      return { success: false, error: 'Registration failed' };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'An error occurred during registration' };
    }
  };

  const login = async (data: LoginMemberData): Promise<{ success: boolean; error?: string; member?: Member }> => {
    try {
      // Find member by email
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', data.email)
        .single();

      if (error || !member) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if member is active
      if (member.status !== 'active') {
        return { success: false, error: 'Account is inactive' };
      }

      // Verify password
      const isValid = await verifyPassword(data.password, member.password_hash);
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Set member in localStorage and state
      localStorage.setItem('member_id', member.id);
      setCurrentMember(member as Member);
      // Dispatch custom event to notify other instances
      window.dispatchEvent(new CustomEvent('memberAuthUpdate'));
      return { success: true, member: member as Member };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const logout = () => {
    localStorage.removeItem('member_id');
    setCurrentMember(null);
  };

  const isReseller = () => {
    return currentMember?.user_type === 'reseller';
  };

  return {
    currentMember,
    loading,
    register,
    login,
    logout,
    isReseller,
    isAuthenticated: !!currentMember
  };
};

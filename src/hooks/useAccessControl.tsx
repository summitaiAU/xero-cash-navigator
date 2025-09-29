import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AccessControlData {
  isAllowed: boolean;
  loading: boolean;
  role: string | null;
}

export const useAccessControl = (): AccessControlData => {
  const { user, loading: authLoading } = useAuth();
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      if (!user?.email) {
        setIsAllowed(false);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        console.log('Checking access for user via RPC:', user.email);
        // First, check access using the database function (runs with proper auth context)
        const { data: allowData, error: allowError } = await supabase.rpc('is_user_allowed', {
          user_email: user.email,
        });

        if (allowError) {
          console.error('is_user_allowed RPC error:', allowError);
          setIsAllowed(false);
          setRole(null);
          setLoading(false);
          return;
        }

        if (allowData === true) {
          // Optionally fetch role for UI purposes
          const { data: roleData, error: roleError } = await supabase
            .from('allowed_users')
            .select('role')
            .eq('email', user.email.toLowerCase())
            .eq('active', true)
            .single();

          if (roleError && roleError.code !== 'PGRST116') {
            console.warn('Could not load user role, proceeding with access granted:', roleError);
            setIsAllowed(true);
            setRole(null);
          } else if (roleData) {
            console.log('User access granted with role:', roleData.role);
            setIsAllowed(true);
            setRole(roleData.role);
          } else {
            setIsAllowed(true);
            setRole(null);
          }
        } else {
          console.log('User not allowed by function');
          setIsAllowed(false);
          setRole(null);
        }
      } catch (error) {
        console.error('Access check failed:', error);
        setIsAllowed(false);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, authLoading]);

  return { isAllowed, loading: authLoading || loading, role };
};
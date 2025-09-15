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
        console.log('Checking access for user:', user.email);
        const { data, error } = await supabase
          .from('allowed_users')
          .select('role, active')
          .eq('email', user.email.toLowerCase())
          .eq('active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking access:', error);
          setIsAllowed(false);
          setRole(null);
        } else if (data) {
          console.log('User access granted:', data);
          setIsAllowed(true);
          setRole(data.role);
        } else {
          console.log('User not in allowlist');
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
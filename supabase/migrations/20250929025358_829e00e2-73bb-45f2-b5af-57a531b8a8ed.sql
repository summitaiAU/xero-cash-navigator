-- Ensure the user has proper access
-- First, let's make sure kirt.quar@hotmail.com has admin access
INSERT INTO public.allowed_users (email, role, active) 
VALUES ('kirt.quar@hotmail.com', 'admin', true)
ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  active = true;

-- Also ensure any variations are covered
INSERT INTO public.allowed_users (email, role, active) 
VALUES ('kirt.quar@hotmail.com.au', 'admin', true)
ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  active = true;
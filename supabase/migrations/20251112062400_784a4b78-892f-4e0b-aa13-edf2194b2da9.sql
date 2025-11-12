-- Clean up development/testing API errors from specific user
-- This removes 70,858 error logs (99.3% of all API_ERROR entries) 
-- that were generated during development and testing

DELETE FROM audit_logs 
WHERE action_type = 'API_ERROR' 
  AND user_email = 'kirt.quar@hotmail.com';

-- After this cleanup, only 481 API errors from other users remain
-- This provides a clean baseline to monitor real production issues
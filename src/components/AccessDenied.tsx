import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AccessDenied = () => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    try {
      // Log the sign out action before actually signing out
      try {
        const { auditService } = await import('@/services/auditService');
        await auditService.logSignOut();
      } catch (error) {
        console.error('Failed to log sign out:', error);
        // Don't prevent sign out if audit logging fails
      }
      
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold text-destructive">
            Access Denied
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Your account ({user?.email}) does not have permission to access this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              Need access?
            </div>
            <p className="text-sm">
              Please contact your administrator to request access to this dashboard.
            </p>
          </div>
          
          <Button 
            onClick={handleSignOut}
            variant="outline" 
            className="w-full"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
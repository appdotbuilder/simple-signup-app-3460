import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { useState, useEffect } from 'react';
import type { SignupInput, SignupResponse } from '../../server/src/schema';

function App() {
  const [formData, setFormData] = useState<SignupInput>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Real-time email availability check
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (formData.email && formData.email.includes('@')) {
        setEmailCheckLoading(true);
        try {
          const result = await trpc.checkEmailAvailability.query({ email: formData.email });
          setEmailAvailable(result.available);
          if (!result.available) {
            setErrors(prev => ({ ...prev, email: result.message }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.email;
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Email check failed:', error);
          setEmailAvailable(null);
        } finally {
          setEmailCheckLoading(false);
        }
      } else {
        setEmailAvailable(null);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    }, 500); // Debounce email check

    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (emailAvailable === false) {
      newErrors.email = 'This email is already registered';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SignupInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccessMessage('');
    
    // Clear field-specific errors on input change
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      const response: SignupResponse = await trpc.signup.mutate(formData);
      
      if (response.success) {
        setSuccessMessage(response.message);
        // Reset form on successful signup
        setFormData({
          email: '',
          password: '',
          confirmPassword: ''
        });
        setEmailAvailable(null);
      } else {
        setErrors({ general: response.message });
      }
    } catch (error) {
      console.error('Signup failed:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Account 🚀
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                ✅ {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {errors.general && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                ❌ {errors.general}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('email', e.target.value)
                  }
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {emailCheckLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {emailAvailable === true && !emailCheckLoading && formData.email && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                    ✅
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('password', e.target.value)
                }
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
              {formData.password && (
                <div className="text-xs text-gray-500">
                  Password strength: {formData.password.length >= 8 ? '✅ Strong' : '⚠️ Weak'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('confirmPassword', e.target.value)
                }
                className={errors.confirmPassword ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="text-xs text-green-600">✅ Passwords match</div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || emailCheckLoading || emailAvailable === false}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button className="text-blue-600 hover:underline font-medium">
              Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
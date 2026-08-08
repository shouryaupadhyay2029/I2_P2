import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthenticationLayout } from '../../components/layout/AuthenticationLayout';
import { FormField } from '../../components/ui/FormField';
import { PasswordField } from '../../components/ui/PasswordField';
import { Button } from '../../components/ui/Button';
import { FormDivider } from '../../components/ui/FormDivider';
import { SocialButton } from '../../components/ui/SocialButton';
import { staggerItem, staggerContainer } from '../../animations/framerPresets';
import { useAuth } from '../../hooks/useAuth';

export const SignIn = () => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await googleLogin();
      if (result.error) {
        setError(result.error);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during Google Sign-In.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthenticationLayout
      title="Welcome back to NovaEvent."
      subtitle="Sign in to continue exploring and organizing events."
    >
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem} className="mb-8">
          <h2 className="text-section-heading text-primary mb-2">Sign In</h2>
          <p className="text-secondary text-body">Enter your details to access your account.</p>
        </motion.div>

        {error && (
          <motion.div 
            variants={staggerItem}
            className="mb-6 p-4 border border-red-500/20 bg-red-950/20 text-red-400 text-xs font-technical uppercase tracking-wider"
          >
            {error}
          </motion.div>
        )}

        <motion.form variants={staggerItem} onSubmit={handleSubmit} className="space-y-6">
          <FormField
            id="email"
            type="email"
            label="Email Address"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          
          <PasswordField
            id="password"
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          <div className="flex items-center justify-between text-small mt-2 mb-8">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded-sm border-border bg-transparent text-accent focus:ring-accent focus:ring-offset-background"
              />
              <span className="text-secondary group-hover:text-primary transition-colors">
                Remember me
              </span>
            </label>
            <Link 
              to="/auth/forgot-password" 
              className="text-secondary hover:text-accent transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <FormDivider text="Or" />

          <SocialButton type="button" onClick={handleGoogleLogin} disabled={isLoading}>
            Continue with Google
          </SocialButton>
        </motion.form>

        <motion.p variants={staggerItem} className="mt-8 text-center text-body text-secondary">
          Don't have an account?{' '}
          <Link 
            to="/auth/register" 
            className="text-primary hover:text-accent transition-colors border-b border-transparent hover:border-accent"
          >
            Create Account
          </Link>
        </motion.p>
      </motion.div>
    </AuthenticationLayout>
  );
};

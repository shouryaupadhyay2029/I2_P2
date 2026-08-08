import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticationLayout } from '../../components/layout/AuthenticationLayout';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { staggerItem, staggerContainer } from '../../animations/framerPresets';
import { ValidationMessage } from '../../components/ui/ValidationMessage';

export const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <AuthenticationLayout
      title="Reset your password."
      subtitle="We'll send you instructions to get you back into your account."
    >
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem} className="mb-8">
          <h2 className="text-section-heading text-primary mb-2">Forgot Password</h2>
          <p className="text-secondary text-body">Enter your email to receive a reset link.</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.form 
              key="form"
              variants={staggerItem} 
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit} 
              className="space-y-6"
            >
              <FormField
                id="email"
                type="email"
                label="Email Address"
                required
                autoComplete="email"
              />

              <Button 
                type="submit" 
                className="w-full mt-2"
                disabled={isLoading}
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ValidationMessage 
                type="success" 
                message="If an account exists with this email, a reset link has been sent."
                className="mb-8"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p variants={staggerItem} className="mt-8 text-center text-body text-secondary">
          Remembered your password?{' '}
          <Link 
            to="/auth/login" 
            className="text-primary hover:text-accent transition-colors border-b border-transparent hover:border-accent"
          >
            Sign In
          </Link>
        </motion.p>
      </motion.div>
    </AuthenticationLayout>
  );
};

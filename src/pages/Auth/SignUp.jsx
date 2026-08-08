import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthenticationLayout } from '../../components/layout/AuthenticationLayout';
import { FormField } from '../../components/ui/FormField';
import { PasswordField } from '../../components/ui/PasswordField';
import { Button } from '../../components/ui/Button';
import { staggerItem, staggerContainer } from '../../animations/framerPresets';
import { useAuth } from '../../hooks/useAuth';
import { updateUser } from '../../services/userService';

export const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName || !email || !department || !year || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await signup(email, password, fullName);
      if (result.error) {
        setError(result.error);
      } else if (result.user) {
        // Sync custom fields (branch and year) to the newly created user profile doc in Firestore
        try {
          await updateUser(result.user.uid, {
            branch: department,
            year: year
          });
        } catch (dbErr) {
          console.error("Failed to write custom fields to user profile: ", dbErr);
        }
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthenticationLayout
      title="Join the NovaEvent community."
      subtitle="Create an account to start discovering and organizing events."
    >
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem} className="mb-8">
          <h2 className="text-section-heading text-primary mb-2">Create Account</h2>
          <p className="text-secondary text-body">Enter your details to get started.</p>
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
            id="fullName"
            type="text"
            label="Full Name"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />
          
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              id="department"
              type="text"
              label="Department"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isLoading}
            />
            <FormField
              id="year"
              type="text"
              label="Year"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          
          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />

          <Button 
            type="submit" 
            className="w-full mt-4"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </motion.form>

        <motion.p variants={staggerItem} className="mt-8 text-center text-body text-secondary">
          Already have an account?{' '}
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

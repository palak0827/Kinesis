import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { supabase } from '@backend/services/supabaseClient.js';
import { Check, Shield, Star, Award, User, UserCheck, Eye, EyeOff } from 'lucide-react';
import { MEMBERSHIP_DURATIONS, calculateMembershipPrice } from '../../utils/pricingEngine.js';

import {
  EMAIL_REGEX,
  PHONE_REGEX,
  calculateAge,
  validateName,
  validateEmail,
  validatePhone,
  validateDob,
  validatePassword,
  validateConfirm
} from '../../utils/registrationValidation.js';

export { calculateAge, EMAIL_REGEX, PHONE_REGEX, validateName, validateEmail, validatePhone, validateDob, validatePassword, validateConfirm };

export default function Register({ navigate }) {
  const { register } = useAuth();
  
  // Steps:
  // 1: Details (Name, Email, Phone, DOB, Password)
  // 2: Choose Customer Category: [ Become a Member ] or [ Continue as Walk-In ]
  // 3: Membership Selection (Tier, Duration, Summary)
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirm: ''
  });

  // Dedicated validation error tracking per field
  const [fieldErrors, setFieldErrors] = useState({});

  // Independent password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedDurationMonths, setSelectedDurationMonths] = useState(12); // Default Annual
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(false);

  // Field change handlers with live error removal on correction
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, name: val }));
    const nameErr = validateName(val);
    if (!nameErr && fieldErrors.name) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, email: val }));
    const emailErr = validateEmail(val);
    if (!emailErr && fieldErrors.email) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    const phoneErr = validatePhone(digitsOnly);
    if (!phoneErr && fieldErrors.phone) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const handleDobChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, dob: val }));
    const dobErr = validateDob(val);
    if (!dobErr && fieldErrors.dob) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.dob;
        return next;
      });
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, password: val }));
    if (fieldErrors.password && val.length >= 6) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
    if (formData.confirm && fieldErrors.confirm && val === formData.confirm) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.confirm;
        return next;
      });
    }
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, confirm: val }));
    if (fieldErrors.confirm && val === formData.password) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.confirm;
        return next;
      });
    }
  };

  // Step 1 Validation Runner
  const validateStepOne = () => {
    const newErrors = {};

    const nameErr = validateName(formData.name);
    if (nameErr) newErrors.name = nameErr;

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const dobErr = validateDob(formData.dob);
    if (dobErr) newErrors.dob = dobErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    const confErr = validateConfirm(formData.password, formData.confirm);
    if (confErr) newErrors.confirm = confErr;

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch membership plans from PostgreSQL table
  useEffect(() => {
    async function loadPlans() {
      setFetchingPlans(true);
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('membership_plans')
            .select('*')
            .order('id', { ascending: true });
          if (!error && data && data.length > 0) {
            setPlans(data);
            setSelectedPlanId(data[0].id);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load plans from database:', err);
      } finally {
        setFetchingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');

    // Strict validation check before allowing transition to Step 2
    if (!validateStepOne()) {
      return;
    }

    setLoading(true);

    try {
      // Email & Phone uniqueness validation
      if (supabase) {
        const [
          { data: existingEmail, error: checkError },
          { data: existingPhone, error: phoneError }
        ] = await Promise.all([
          supabase
            .from('members')
            .select('id')
            .eq('email', formData.email.trim().toLowerCase())
            .maybeSingle(),
          supabase
            .from('members')
            .select('id')
            .eq('phone', formData.phone.trim())
            .maybeSingle()
        ]);

        if (checkError || phoneError) {
          console.error(checkError || phoneError);
          throw new Error('Something went wrong checking credentials. Please try again.');
        }

        if (existingEmail) {
          setFieldErrors((prev) => ({
            ...prev,
            email: 'An account with this email already exists.'
          }));
          setLoading(false);
          return;
        }

        if (existingPhone) {
          setFieldErrors((prev) => ({
            ...prev,
            phone: 'An account with this phone number already exists.'
          }));
          setLoading(false);
          return;
        }
      }

      // Proceed to Step 2 (Choose Walk-In vs Member)
      setStep(2);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Continue as Walk-In user (no paid membership)
  const handleWalkInRegistration = async () => {
    setError('');
    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        plan_id: null,
        user_type: 'WALK_IN',
        password: formData.password
      });

      navigate('home');
    } catch (err) {
      setError(err.message || 'Failed to create Walk-In account.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setError('');
    const planName = (plan.name || '').toLowerCase();

    if (planName === 'junior') {
      const age = calculateAge(formData.dob);
      if (age >= 18) {
        setError('Junior membership is available for members under 18.');
        return;
      }
    }

    setSelectedPlanId(plan.id);
  };

  const handleCompleteMemberRegistration = async () => {
    setError('');

    if (!selectedPlanId) {
      setError('Please select a membership plan to continue.');
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan && plan.name.toLowerCase() === 'junior') {
      const age = calculateAge(formData.dob);
      if (age >= 18) {
        setError('Junior membership is available for members under 18.');
        return;
      }
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        plan_id: selectedPlanId,
        user_type: 'MEMBER',
        durationMonths: selectedDurationMonths,
        password: formData.password
      });

      navigate('home');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const membershipPricing = selectedPlan
    ? calculateMembershipPrice(selectedPlan.monthly_price, selectedDurationMonths)
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Top Branding */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('landing')}>
        <h2 style={{ margin: 0, letterSpacing: '0.08em', color: 'var(--primary)' }}>KINESIS</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Sports Club</span>
      </div>

      {step === 1 && (
        /* STEP 1: CREATE ACCOUNT DETAILS */
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Step 1 of 2
            </span>
            <h1 style={{ fontSize: '1.8rem', margin: '0.4rem 0 0.5rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              CREATE YOUR ACCOUNT
            </h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Enter your personal details to begin registration
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form noValidate onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan Miller"
                value={formData.name}
                onChange={handleNameChange}
                className="form-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderColor: fieldErrors.name ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.name && (
                <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {fieldErrors.name}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className="form-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.email ? '#dc2626' : undefined
                  }}
                />
                {fieldErrors.email && (
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="form-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.phone ? '#dc2626' : undefined
                  }}
                />
                {fieldErrors.phone && (
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={handleDobChange}
                className="form-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderColor: fieldErrors.dob ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.dob ? (
                <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {fieldErrors.dob}
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Used to verify Junior membership eligibility (under 18).
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 chars"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    className="form-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      paddingRight: '2.5rem',
                      borderColor: fieldErrors.password ? '#dc2626' : undefined
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Confirm Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={formData.confirm}
                    onChange={handleConfirmChange}
                    className="form-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      paddingRight: '2.5rem',
                      borderColor: fieldErrors.confirm ? '#dc2626' : undefined
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirm && (
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.confirm}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.9rem', fontSize: '1rem', fontWeight: 600, marginTop: '1rem', cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Validating...' : 'Continue'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
            <button
              type="button"
              onClick={() => navigate('login')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Login
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        /* STEP 2: CATEGORY CHOICE - BECOME A MEMBER VS CONTINUE AS WALK-IN */
        <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '2.5rem', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Step 2 of 2
            </span>
            <h1 style={{ fontSize: '1.8rem', margin: '0.4rem 0 0.5rem 0', color: 'var(--text-main)' }}>
              HOW WOULD YOU LIKE TO JOIN?
            </h1>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
              Choose whether you want full club privileges or flexible pay-as-you-go access.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Choice 1: Member */}
            <div
              style={{
                border: '2px solid var(--primary)',
                background: 'rgba(6, 78, 59, 0.04)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Award size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary)' }}>Become a Member</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Full privileges: up to 50% court discounts, gear discounts, café discounts, and higher daily booking quotas.
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>Up to 50% off court reservations</li>
                  <li>Gear Shop & Café member discounts</li>
                  <li>Higher daily booking limits (up to 3/day)</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', fontWeight: 700 }}
              >
                Select Membership Tier
              </button>
            </div>

            {/* Choice 2: Walk-In */}
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <User size={20} color="var(--text-muted)" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Continue as Walk-In</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Pay-as-you-go access. Book courts at public rates and enjoy the club without recurring membership fees.
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>Standard public court rates</li>
                  <li>Max 1 court booking per day</li>
                  <li>Full access to Gear Shop & Café</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleWalkInRegistration}
                disabled={loading}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', fontWeight: 600 }}
              >
                {loading ? 'Creating Account...' : 'Continue as Walk-In'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              ← Back to Details
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        /* STEP 3: MEMBERSHIP TIER & DURATION OPTIONS */
        <div style={{ maxWidth: '960px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Tier & Duration
            </span>
            <h1 style={{ fontSize: '2.2rem', margin: '0.3rem 0 0.4rem 0', color: 'var(--text-main)' }}>
              SELECT YOUR MEMBERSHIP PLAN
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Choose your membership tier and duration. Save up to 15% with annual subscription.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Tier Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isGold = plan.name.toLowerCase() === 'gold';
              const isJunior = plan.name.toLowerCase() === 'junior';

              return (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    padding: '1.75rem',
                    background: 'var(--bg-surface)'
                  }}
                >
                  {isGold && (
                    <div style={{ position: 'absolute', top: '-11px', right: '1rem', background: '#f59e0b', color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Premium Tier
                    </div>
                  )}
                  {isJunior && (
                    <div style={{ position: 'absolute', top: '-11px', right: '1rem', background: '#3b82f6', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Under 18
                    </div>
                  )}

                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>{plan.name}</h3>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(plan.monthly_price).toFixed(0)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ month</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-main)', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <div>🎾 Court Discount: <strong>{plan.court_discount}% OFF</strong></div>
                    <div>🛍️ Gear Shop Discount: <strong>{plan.shop_discount}% OFF</strong></div>
                    <div>☕ Café & Bar Discount: <strong>{plan.bar_discount}% OFF</strong></div>
                    <div>📅 Daily Booking Limit: <strong>{plan.daily_booking_limit} slots/day</strong></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duration Selector */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Choose Subscription Duration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {MEMBERSHIP_DURATIONS.map((dur) => {
                const selected = selectedDurationMonths === dur.months;
                return (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => setSelectedDurationMonths(dur.months)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: selected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: selected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, color: selected ? 'var(--primary)' : 'var(--text-main)' }}>{dur.label}</span>
                      <span style={{ fontSize: '0.72rem', background: selected ? 'var(--primary)' : 'var(--border-subtle)', color: selected ? 'white' : 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {dur.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {dur.months} {dur.months === 1 ? 'Month' : 'Months'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing Summary */}
          {membershipPricing && (
            <div className="card" style={{ padding: '1.75rem', background: 'var(--bg-surface)', borderLeft: '4px solid var(--primary)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Membership Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>{selectedPlan?.name} Tier ({membershipPricing.months} Months Base):</span>
                  <span>₹{membershipPricing.baseAmount.toFixed(2)}</span>
                </div>

                {membershipPricing.discountPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                    <span>Duration Discount ({membershipPricing.discountPercent}% OFF):</span>
                    <span>-₹{membershipPricing.durationDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <span>Membership Validity:</span>
                  <span>{membershipPricing.startDateStr} to {membershipPricing.expiryDateStr}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span>Final Membership Price:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹{membershipPricing.finalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={handleCompleteMemberRegistration}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 700 }}
            >
              {loading ? 'Finalizing Membership...' : `Activate ${selectedPlan?.name} Membership`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

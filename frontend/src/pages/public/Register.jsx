import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { supabase } from '@backend/services/supabaseClient.js';
import { Check, Shield, Star, Award } from 'lucide-react';

export function calculateAge(dobString) {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function Register({ navigate }) {
  const { register } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirm: ''
  });
  
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(false);

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

    // Validations
    if (!formData.name.trim() || !formData.email.trim() || !formData.dob || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password !== formData.confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // Email uniqueness validation
      if (supabase) {
        const { data: existing, error: checkError } = await supabase
          .from('members')
          .select('id')
          .eq('email', formData.email.trim().toLowerCase())
          .maybeSingle();

        if (checkError) {
          console.error(checkError);
          throw new Error('Something went wrong. Please try again.');
        }

        if (existing) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }
      }

      setStep(2);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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

  const handleCompleteRegistration = async () => {
    setError('');

    if (!selectedPlanId) {
      setError('Please select a membership plan to continue.');
      return;
    }

    const plan = plans.find(p => p.id === selectedPlanId);
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
        password: formData.password
      });

      // Session is stored in localStorage by register(), redirect to /member
      navigate('home');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      {/* Top Branding */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('landing')}>
        <h2 style={{ margin: 0, letterSpacing: '0.08em', color: 'var(--primary)' }}>KINESIS</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Sports Club</span>
      </div>

      {step === 1 ? (
        /* STEP 1: CREATE ACCOUNT DETAILS */
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)', borderRadius: 'var(--radius-md)' }}>
          
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Step 1 of 2
            </span>
            <h1 style={{ fontSize: '1.8rem', margin: '0.4rem 0 0.5rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              CREATE YOUR KINESIS ACCOUNT
            </h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Enter your personal details to begin registration
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan Miller"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Used to verify Junior membership eligibility (under 18).
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Password *
                </label>
                <input
                  type="password"
                  placeholder="Min. 6 chars"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirm}
                  onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                  required
                  minLength={6}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '0.9rem',
                fontSize: '1rem',
                fontWeight: 600,
                marginTop: '1rem',
                cursor: loading ? 'wait' : 'pointer'
              }}
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
      ) : (
        /* STEP 2: CHOOSE YOUR MEMBERSHIP */
        <div style={{ maxWidth: '960px', width: '100%' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Step 2 of 2
            </span>
            <h1 style={{ fontSize: '2.4rem', margin: '0.4rem 0 0.5rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              CHOOSE YOUR MEMBERSHIP
            </h1>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>
              Select the plan that matches your play style. Benefits and discounts are dynamically configured.
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem auto',
              textAlign: 'center',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {fetchingPlans ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading plans from database...</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem'
            }}>
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
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : '1px solid var(--border-subtle)',
                      boxShadow: isSelected
                        ? '0 10px 30px rgba(6, 78, 59, 0.15)'
                        : '0 4px 15px rgba(0, 0, 0, 0.04)',
                      transform: isSelected ? 'scale(1.02)' : 'none',
                      transition: 'all 0.25s ease',
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--bg-surface)'
                    }}
                  >
                    {isGold && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--accent-gold, #f59e0b)',
                        color: '#000',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 12px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Most Popular
                      </div>
                    )}

                    {isJunior && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 12px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Under 18 Only
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {plan.name}
                      </h3>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border-subtle)',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        ${plan.monthly_price}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> / month</span>
                    </div>

                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1.5rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}>
                      {isGold && 'Full premium club privileges with top priority.'}
                      {plan.name.toLowerCase() === 'silver' && 'Standard access with balanced club privileges.'}
                      {isJunior && 'Dedicated youth membership for athletes under 18.'}
                    </div>

                    {/* Dynamic Database Benefits */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Check size={16} color="var(--primary)" />
                        <span><strong>{plan.court_discount}%</strong> Court Discount</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Check size={16} color="var(--primary)" />
                        <span><strong>{plan.shop_discount}%</strong> Pro Shop Discount</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Check size={16} color="var(--primary)" />
                        <span><strong>{plan.bar_discount}%</strong> Clubhouse Bar Discount</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Check size={16} color="var(--primary)" />
                        <span><strong>{plan.daily_booking_limit}</strong> Booking/day Limit</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handlePlanSelect(plan); }}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? 'white' : 'var(--text-main)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select ' + plan.name}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1.5rem' }}
            >
              &larr; Back to Details
            </button>

            <button
              type="button"
              onClick={handleCompleteRegistration}
              disabled={loading || !selectedPlanId}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: (loading || !selectedPlanId) ? 'not-allowed' : 'pointer',
                opacity: (!selectedPlanId) ? 0.6 : 1
              }}
            >
              {loading ? 'Creating Member Account...' : 'Complete Registration'}
            </button>
          </div>

        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('landing')}
        style={{ marginTop: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
      >
        &larr; Back to Kinesis Sports Club
      </button>

    </div>
  );
}

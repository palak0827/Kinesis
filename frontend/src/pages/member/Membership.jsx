import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { supabase } from '@backend/services/supabaseClient.js';
import { recordPayment } from '@backend/services/paymentService.js';
import {
  getUserPricingContext,
  MEMBERSHIP_DURATIONS,
  calculateMembershipPrice
} from '../../utils/pricingEngine.js';
import UnifiedPaymentModal from '../../components/UnifiedPaymentModal.jsx';
import ReceiptModal from '../../components/ReceiptModal.jsx';
import { Award, Check, Sparkles, AlertCircle, Clock } from 'lucide-react';

export default function Membership() {
  const { memberProfile, refreshMemberProfile } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Upgrade / Renewal state
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedDurationMonths, setSelectedDurationMonths] = useState(12); // Default Annual
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Fetch membership plans from database
  useEffect(() => {
    async function loadPlans() {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('membership_plans')
            .select('*')
            .order('id');
          if (!error && data) {
            setPlans(data);
            setSelectedPlanId(data[0]?.id || 1);
          }
        }
      } catch (e) {
        console.warn('Could not load plans:', e);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const pricingCtx = getUserPricingContext(memberProfile);
  const { isWalkIn, isExpired, isExpiringSoon, daysRemaining, planName } = pricingCtx;

  const activePlan = memberProfile?.membership_plans;
  const targetPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const calculated = targetPlan
    ? calculateMembershipPrice(targetPlan.monthly_price, selectedDurationMonths)
    : null;

  const handleOpenPayment = () => {
    setErrorMsg('');
    if (!targetPlan) {
      setErrorMsg('Please select a membership plan.');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleConfirmPayment = async ({ paymentMethod, paymentStatus, paymentDetails }) => {
    if (!memberProfile?.id || !targetPlan || !calculated) return;

    setProcessing(true);
    setErrorMsg('');

    try {
      const startDate = calculated.startDateStr;
      const expiryDate = calculated.expiryDateStr;

      // 1. Update member record in PostgreSQL
      if (supabase) {
        const updatePayload = {
          plan_id: targetPlan.id,
          status: 'active',
          user_type: 'MEMBER',
          start_date: startDate,
          expiry_date: expiryDate
        };

        const { error: updateErr } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', memberProfile.id);

        if (updateErr) {
          // Fallback if user_type column is pending migration
          delete updatePayload.user_type;
          await supabase.from('members').update(updatePayload).eq('id', memberProfile.id);
        }
      }

      // 2. Record in unified payments audit
      const paymentRecord = await recordPayment({
        memberId: memberProfile.id,
        referenceType: 'MEMBERSHIP',
        referenceId: targetPlan.id,
        amount: calculated.finalPrice,
        paymentMethod,
        paymentStatus,
        paymentDetails: {
          planName: targetPlan.name,
          months: calculated.months,
          ...paymentDetails
        }
      });

      // 3. Refresh Auth session state
      await refreshMemberProfile();

      // 4. Show official receipt modal
      setSuccessReceipt({
        id: paymentRecord?.id || Date.now(),
        receiptNumber: `#KSC-MEM-${String(paymentRecord?.id || Math.floor(Math.random() * 9000 + 1000)).padStart(4, '0')}`,
        customerName: memberProfile.name,
        created_at: new Date().toISOString(),
        subtotal: calculated.baseAmount,
        discountAmount: calculated.durationDiscountAmount,
        total: calculated.finalPrice,
        paymentMethod,
        paymentStatus,
        planName: targetPlan.name,
        durationMonths: calculated.months
      });

      setIsCheckoutOpen(false);
    } catch (err) {
      console.error('Membership payment error:', err);
      setErrorMsg(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.4rem' }}>My Membership</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Manage your club privileges, renewal options, and duration discounts.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {errorMsg}
        </div>
      )}

      {/* CURRENT STATUS CARD */}
      <div
        style={{
          background: isWalkIn
            ? 'linear-gradient(135deg, #374151 0%, #111827 100%)'
            : isExpired
            ? 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)'
            : 'linear-gradient(135deg, var(--primary) 0%, #064e3b 100%)',
          color: 'white',
          padding: '2.25rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '12rem', opacity: 0.05, lineHeight: 1 }}>
          K
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.8rem', marginBottom: '0.4rem', opacity: 0.85, fontWeight: 600 }}>
              Kinesis Sports Club
            </p>
            <h2 style={{ fontSize: '2.4rem', margin: 0, letterSpacing: '-0.02em' }}>
              {isWalkIn ? 'Walk-In Guest' : `${activePlan?.name || 'Standard'} Tier`}
            </h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                background: isWalkIn ? 'rgba(255, 255, 255, 0.2)' : isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)',
                color: isWalkIn ? '#f3f4f6' : isExpired ? '#fca5a5' : '#a7f3d0',
                padding: '5px 14px',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {isWalkIn ? 'Pay-as-you-go' : isExpired ? 'Expired' : 'Active Member'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Member Name
            </p>
            <p style={{ fontWeight: 600, fontSize: '1.15rem', margin: '0 0 0.35rem 0' }}>
              {memberProfile?.name || 'Guest'}
            </p>
            <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: 0, fontFamily: 'var(--font-mono)' }}>
              Club ID: {memberProfile?.club_id || 'N/A'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Valid Until
            </p>
            <p style={{ fontWeight: 600, fontSize: '1.15rem', margin: 0 }}>
              {isWalkIn
                ? 'Standard Access'
                : memberProfile?.expiry_date
                ? new Date(memberProfile.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '1 Year'}
            </p>
          </div>
        </div>
      </div>

      {/* ACTIVE TIER PRIVILEGES */}
      <h2 style={{ marginBottom: '1.25rem', fontSize: '1.4rem' }}>Your Current Privileges</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: 'var(--primary)' }}>
            {pricingCtx.courtDiscountPercent}%
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Court Reservation Discount</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: 'var(--primary)' }}>
            {pricingCtx.shopDiscountPercent}%
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Gear Shop Discount</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: 'var(--primary)' }}>
            {pricingCtx.barDiscountPercent}%
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Café & Bar Discount</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: 'var(--primary)' }}>
            {pricingCtx.dailyBookingLimit}
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Max Court Bookings / Day</p>
        </div>
      </div>

      {/* UPGRADE / RENEWAL WORKFLOW SECTION */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--primary)' }}>
            {isWalkIn ? 'Membership Upgrade' : isExpired ? 'Membership Renewal' : 'Extend / Upgrade Membership'}
          </span>
          <h2 style={{ fontSize: '1.6rem', margin: '0.35rem 0' }}>
            {isWalkIn ? 'Upgrade to Club Membership' : 'Select Subscription Plan & Duration'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Choose a tier and subscription duration. Longer durations unlock higher discount savings.
          </p>
        </div>

        {/* Step 1: Select Plan Tier */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            1. Select Membership Tier
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {plans.map((p) => {
              const selected = selectedPlanId === p.id;
              const isGold = p.name.toLowerCase() === 'gold';
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: selected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: selected ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-main)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {isGold && (
                    <span style={{ position: 'absolute', top: '-10px', right: '1rem', background: '#f59e0b', color: '#000', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      POPULAR
                    </span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{p.name}</h3>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      ₹{Number(p.monthly_price).toFixed(0)}/mo
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span>🎾 {p.court_discount}% Court Discount</span>
                    <span>🛍️ {p.shop_discount}% Gear Discount</span>
                    <span>☕ {p.bar_discount}% Café Discount</span>
                    <span>📅 {p.daily_booking_limit} daily booking quota</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Duration */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            2. Choose Duration
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {MEMBERSHIP_DURATIONS.map((dur) => {
              const selected = selectedDurationMonths === dur.months;
              return (
                <button
                  key={dur.id}
                  type="button"
                  onClick={() => setSelectedDurationMonths(dur.months)}
                  style={{
                    padding: '0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    border: selected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: selected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: selected ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.9rem' }}>
                      {dur.label}
                    </span>
                    <span style={{ fontSize: '0.68rem', background: selected ? 'var(--primary)' : 'var(--border-subtle)', color: selected ? 'white' : 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {dur.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {dur.months} {dur.months === 1 ? 'Month' : 'Months'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Calculation Summary */}
        {calculated && (
          <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Subscription Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>{targetPlan?.name} Membership ({calculated.months} Months Base):</span>
                <span>₹{calculated.baseAmount.toFixed(2)}</span>
              </div>

              {calculated.discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                  <span>Duration Discount ({calculated.discountPercent}% OFF):</span>
                  <span>-₹{calculated.durationDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <span>New Expiry Date:</span>
                <span>{calculated.expiryDateStr}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', marginTop: '0.35rem' }}>
                <span>Total Payable:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>₹{calculated.finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleOpenPayment}
            className="btn btn-primary"
            style={{ padding: '0.8rem 2rem', fontSize: '0.95rem', fontWeight: 700 }}
          >
            Continue to Payment
          </button>
        </div>
      </div>

      {/* UNIFIED PAYMENT MODAL */}
      {isCheckoutOpen && calculated && (
        <UnifiedPaymentModal
          amount={calculated.finalPrice}
          title={`Activate ${targetPlan?.name} Membership`}
          subtitle={`${calculated.months}-Month subscription valid until ${calculated.expiryDateStr}`}
          loading={processing}
          onConfirm={handleConfirmPayment}
          onCancel={() => setIsCheckoutOpen(false)}
        />
      )}

      {/* OFFICIAL RECEIPT MODAL */}
      {successReceipt && (
        <ReceiptModal
          receiptType="MEMBERSHIP"
          data={successReceipt}
          onClose={() => setSuccessReceipt(null)}
        />
      )}
    </div>
  );
}

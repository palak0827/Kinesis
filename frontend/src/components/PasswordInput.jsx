import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  style
}) {
  const [show, setShow] = useState(false);
  const ph = placeholder !== undefined ? placeholder : 'Enter password';
  const req = required !== undefined ? required : false;
  const ac = autoComplete !== undefined ? autoComplete : 'current-password';

  return (
    React.createElement('div', { style: { position: 'relative', ...(style || {}) } },
      React.createElement(Lock, {
        size: 16,
        color: 'var(--text-muted)',
        style: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }
      }),
      React.createElement('input', {
        id: id,
        type: show ? 'text' : 'password',
        value: value,
        onChange: onChange,
        placeholder: ph,
        required: req,
        autoComplete: ac,
        className: 'form-input',
        style: { width: '100%', boxSizing: 'border-box', paddingLeft: '2.4rem', paddingRight: '2.8rem' }
      }),
      React.createElement('button', {
        type: 'button',
        'aria-label': show ? 'Hide password' : 'Show password',
        onClick: function() { setShow(function(s) { return !s; }); },
        style: {
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center'
        }
      },
        show
          ? React.createElement(EyeOff, { size: 16 })
          : React.createElement(Eye, { size: 16 })
      )
    )
  );
}
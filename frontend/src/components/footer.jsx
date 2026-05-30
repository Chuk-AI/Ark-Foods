import React from 'react';

function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
        &copy; 2025 Ark Foods. All rights reserved.
      </span>
    </footer>
  );
}

export default Footer;

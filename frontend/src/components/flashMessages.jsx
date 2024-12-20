

// import React from 'react';

// function FlashMessages({ messages, error }) {
//   if (!messages || messages.length === 0) {
//     return null; // Don't render anything if no messages
//   }
//   return (
//     <div>
//       {messages && <div className="alert alert-success mt-3">{messages}</div>}
//       {error && <div className="alert alert-danger mt-3">{error}</div>}
//     </div>
//   );
// }

// export default FlashMessages;
import React, { useEffect, useState } from 'react';

function FlashMessages({ messages, error, onClear }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (messages || error) {
      setVisible(true); // Ensure visibility when new messages or errors come in

      const timer = setTimeout(() => {
        setVisible(false); // Hide the message after 5 seconds
        if (onClear) {
          onClear(); // Clear messages in the parent component if needed
        }
      }, 5000); // 5 seconds

      return () => clearTimeout(timer); // Cleanup timer on component unmount
    }
  }, [messages, error, onClear]);

  if (!visible || (!messages && !error)) {
    return null; // Don't render anything if not visible or no messages
  }

  return (
    <div>
      {messages && <div className="alert alert-success mt-3">{messages}</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
    </div>
  );
}

export default FlashMessages;

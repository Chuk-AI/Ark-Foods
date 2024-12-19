// import React from 'react';

// function FlashMessages({ messages }) {
//   if (!messages || messages.length === 0) {
//     return null; // Don't render anything if no messages
//   }

//   return (
//     <div>
//       {messages.map((msg, index) => (
//         <div key={index} className={`alert alert-${msg.type} mt-2`}>
//           {msg.text}
//         </div>
//       ))}
//     </div>
//   );
// }

// export default FlashMessages;

import React from 'react';

function FlashMessages({ messages, error }) {
  if (!messages || messages.length === 0) {
    return null; // Don't render anything if no messages
  }
  return (
    <div>
      {messages && <div className="alert alert-success mt-3">{messages}</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
    </div>
  );
}

export default FlashMessages;

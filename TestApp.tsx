import React, { useState } from 'react';

const TestApp: React.FC = () => {
    const [count, setCount] = useState(0);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f0f11',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>
                LUMINA <span style={{ color: '#8b5cf6' }}>TEST</span>
            </h1>
            <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                Count: {count}
            </p>
            <button
                onClick={() => setCount(count + 1)}
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                }}
            >
                Increment
            </button>
            <p style={{ marginTop: '2rem', color: '#52525b' }}>
                If you can see this and click the button, React is working!
            </p>
        </div>
    );
};

export default TestApp;

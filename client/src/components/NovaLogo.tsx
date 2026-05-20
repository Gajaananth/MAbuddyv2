import React from 'react';

interface NovaLogoProps {
    size?: number | string;
    className?: string;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 24, className = '' }) => {
    return (
        <img 
            src="/nova-logo.png" 
            alt="Karuppu" 
            style={{ width: size, height: size, minWidth: size, minHeight: size }} 
            className={`object-contain rounded-md shadow-[0_0_15px_rgba(239,68,68,0.5)] ${className}`}
        />
    );
};

import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const Logo: React.FC<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 100 100"
      sx={{
        width: '40px',
        height: '40px',
        ...props.sx
      }}
    >
      <path
        d="M20 20 L80 20 L80 30 L55 30 L55 80 L45 80 L45 30 L20 30 Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
};

export default Logo; 
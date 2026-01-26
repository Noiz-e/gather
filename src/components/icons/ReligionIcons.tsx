interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Default - Abstract circle/wave
export function DefaultIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" />
      <path d="M8 12C8 12 9.5 9 12 9C14.5 9 16 12 16 12C16 12 14.5 15 12 15C9.5 15 8 12 8 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

// Christianity - Cross
export function CrossIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2V22M7 7H17"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Catholicism - Papal Cross (triple bar)
export function PapalCrossIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2V22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 5H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 9H17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 13H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Buddhism - Dharma Wheel
export function DharmaWheelIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
      <path d="M12 3V9M12 15V21M3 12H9M15 12H21M5.64 5.64L9.17 9.17M14.83 14.83L18.36 18.36M5.64 18.36L9.17 14.83M14.83 9.17L18.36 5.64" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Islam - Crescent Moon and Star
export function CrescentIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 7L17.5 8.5L19 9L17.5 9.5L17 11L16.5 9.5L15 9L16.5 8.5L17 7Z"
        fill={color}
      />
    </svg>
  );
}

// Judaism - Star of David
export function StarOfDavidIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L17.5 11H6.5L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 22L6.5 13H17.5L12 22Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Hinduism - Om Symbol
export function OmIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 14C5 14 5 17 8 17C11 17 11 14 11 12C11 10 9 8 7 8M11 12C11 12 11 8 14 8C17 8 19 10 19 13C19 16 16 18 14 18M14 8V5M17 5C17 5 18 4 19 5C20 6 19 7 19 7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Taoism - Yin Yang
export function YinYangIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <path
        d="M12 3C8.13 3 5 6.13 5 10C5 13.87 8.13 17 12 17C15.87 17 12 13.87 12 10C12 6.13 15.87 3 12 3Z"
        fill={color}
      />
      <circle cx="12" cy="7" r="1.5" fill={color === 'currentColor' ? 'white' : 'white'} />
      <circle cx="12" cy="17" r="1.5" fill={color} />
    </svg>
  );
}

// Stage Icons
export function PlanningIcon({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12h6M9 16h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function ScriptIcon({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function RecordingIcon({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function EditingIcon({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 21v-7l11-11 7 7-11 11H4z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 3l5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function ReviewIcon({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

export function PublishedIcon({ size = 20, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Map religion to icon component
export const ReligionIconMap = {
  default: DefaultIcon,
  christianity: CrossIcon,
  catholicism: PapalCrossIcon,
  buddhism: DharmaWheelIcon,
  islam: CrescentIcon,
  judaism: StarOfDavidIcon,
  hinduism: OmIcon,
  taoism: YinYangIcon,
};

// Map stage to icon component
export const StageIconMap = {
  planning: PlanningIcon,
  scripting: ScriptIcon,
  recording: RecordingIcon,
  editing: EditingIcon,
  review: ReviewIcon,
  published: PublishedIcon,
};

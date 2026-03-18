'use client';

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'youtube'] as const;

interface PlatformSelectorProps {
  selected: string[];
  onChange: (platforms: string[]) => void;
}

export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const toggle = (platform: string) => {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  };

  return (
    <div className="flex gap-3">
      {PLATFORMS.map((platform) => (
        <label
          key={platform}
          className="flex items-center gap-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(platform)}
            onChange={() => toggle(platform)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm capitalize">{platform}</span>
        </label>
      ))}
    </div>
  );
}

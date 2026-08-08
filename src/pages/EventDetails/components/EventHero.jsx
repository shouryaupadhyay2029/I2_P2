import React from 'react';
import { EditorialImage } from '../../../components/ui/EditorialImage';

export const EventHero = ({ src, alt, category }) => {
  return (
    <div className="w-full relative mb-16 select-none group">
      <EditorialImage
        src={src}
        alt={alt}
        aspectRatio="aspect-[21/9]"
        grayscale={true}
        width={1200}
        height={514}
      />
      <div className="absolute -bottom-8 left-0 w-full flex justify-between items-center text-micro border-t border-border pt-2">
        <span>FIG. 01 — ARCHIVE // {category?.toUpperCase() || "EVENT"}</span>
        <span>COVER LAYOUT</span>
      </div>
    </div>
  );
};

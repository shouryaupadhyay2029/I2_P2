/**
 * resolveEventImage
 *
 * Centralized utility to resolve event image assets with priority ordering
 * and fallback checks for broken/invalid URLs (such as Google search redirects).
 */
export const resolveEventImage = (event) => {
  const fallback = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop&fm=webp';
  
  if (!event) {
    return fallback;
  }

  // Priority order of possible fields based on standard schema
  const possibleFields = [
    'image',
    'imageUrl',
    'imageURL',
    'coverImage',
    'coverImageUrl',
    'banner',
    'bannerUrl',
    'thumbnail',
    'thumbnailUrl',
    'eventImage',
    'previewImage'
  ];

  let rawUrl = '';
  for (const field of possibleFields) {
    if (event[field] && typeof event[field] === 'string' && event[field].trim() !== '') {
      rawUrl = event[field].trim();
      break;
    }
  }

  // Perform safety checks: must start with HTTP/HTTPS, and not contain search/redirect domains
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl) || rawUrl.includes('google.com/url') || rawUrl.includes('google.com/imgres')) {
    return fallback;
  }

  return rawUrl;
};

import backgroundOne from "../assets/background/background-1.webp";
import backgroundTwo from "../assets/background/background-2.webp";
import backgroundThree from "../assets/background/background-3.webp";
import backgroundFour from "../assets/background/background-4.webp";

export const PUBLIC_BACKGROUND_IMAGES = [
  { image: backgroundOne, width: 1920, height: 1280 },
  { image: backgroundTwo, width: 1920, height: 1275 },
  { image: backgroundThree, width: 1920, height: 1280 },
  { image: backgroundFour, width: 1920, height: 1280 },
];

export const PUBLIC_BACKGROUND_SLIDES = PUBLIC_BACKGROUND_IMAGES.map((background, index) => ({
  ...background,
  label: `Background slide ${index + 1}`,
}));

export function getPublicBackgroundSlides(preferredImage) {
  const preferredIndex = PUBLIC_BACKGROUND_IMAGES.findIndex(
    ({ image }) => image === preferredImage
  );

  if (preferredIndex < 0) {
    return PUBLIC_BACKGROUND_SLIDES;
  }

  return [
    ...PUBLIC_BACKGROUND_SLIDES.slice(preferredIndex),
    ...PUBLIC_BACKGROUND_SLIDES.slice(0, preferredIndex),
  ];
}

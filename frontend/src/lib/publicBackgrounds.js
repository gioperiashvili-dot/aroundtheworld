import backgroundOne from "../assets/background/background-1.jpg";
import backgroundTwo from "../assets/background/background-2.jpg";
import backgroundThree from "../assets/background/background-3.jpg";

export const PUBLIC_BACKGROUND_IMAGES = [
  backgroundOne,
  backgroundTwo,
  backgroundThree,
];

export const PUBLIC_BACKGROUND_SLIDES = PUBLIC_BACKGROUND_IMAGES.map((image, index) => ({
  image,
  label: `Background slide ${index + 1}`,
}));

export function getPublicBackgroundSlides(preferredImage) {
  const preferredIndex = PUBLIC_BACKGROUND_IMAGES.findIndex(
    (image) => image === preferredImage
  );

  if (preferredIndex < 0) {
    return PUBLIC_BACKGROUND_SLIDES;
  }

  return [
    ...PUBLIC_BACKGROUND_SLIDES.slice(preferredIndex),
    ...PUBLIC_BACKGROUND_SLIDES.slice(0, preferredIndex),
  ];
}

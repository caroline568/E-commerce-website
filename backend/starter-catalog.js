export const STARTER_CATALOG = [
  {
    slug: "woven-market-basket-example",
    sku: "KJW-STARTER-BASKET",
    title: "Woven Market Basket",
    summary: "Illustrative listing · Handwoven basket",
    image: "/images/woven-baskets.webp",
    imageAlt: "A group of handwoven baskets",
    additionalMedia: [
      {
        url: "/images/basket-detail.webp",
        alt: "Brown woven baskets arranged on a white table",
        caption: "Basket detail",
        role: "detail",
      },
      {
        url: "/images/weaving-process.webp",
        alt: "A maker weaving straw into a basket",
        caption: "Weaving process",
        role: "process",
      },
    ],
    examplePrice: 8500,
    exampleQuantity: 4,
  },
  {
    slug: "ceramic-vessel-example",
    sku: "KJW-STARTER-CERAMIC",
    title: "Ceramic Vessel",
    summary: "Illustrative listing · Studio pottery",
    image: "/images/ceramic-vessels.webp",
    imageAlt: "A group of ceramic vases in neutral tones",
    additionalMedia: [
      {
        url: "/images/clay-pot-maker.webp",
        alt: "A craftsperson shaping a clay pot",
        caption: "Pottery in progress",
        role: "process",
      },
    ],
    examplePrice: 6200,
    exampleQuantity: 3,
  },
  {
    slug: "wooden-serving-bowl-example",
    sku: "KJW-STARTER-WOOD",
    title: "Wooden Serving Bowl",
    summary: "Illustrative listing · Turned wood object",
    image: "/images/wooden-bowl.webp",
    imageAlt: "A brown wooden bowl on a white table",
    additionalMedia: [
      {
        url: "/images/wooden-bowls.webp",
        alt: "Wooden bowls and plates arranged on a table",
        caption: "A group of wooden forms",
        role: "gallery",
      },
    ],
    examplePrice: 4800,
    exampleQuantity: 2,
  },
];

export function toMinorUnits(amount, currency) {
  const fractionDigits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;

  return Math.round(amount * 10 ** fractionDigits);
}

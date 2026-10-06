import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";
import { safePublicUrl } from "../lib/media";
import { requestApi } from "../services/api";

export default function Home() {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const [result, setResult] = useState({
    query: null,
    products: [],
    error: null,
  });
  const loading = result.query !== search;
  const products = result.products;
  const error = loading ? null : result.error;

  useEffect(() => {
    if (storeLoading || storeError) return undefined;
    const controller = new AbortController();
    const query = new URLSearchParams({ limit: "24" });
    if (search) query.set("q", search);

    requestApi(`/products?${query.toString()}`, { signal: controller.signal })
      .then(({ data }) => setResult({ query: search, products: data, error: null }))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setResult({ query: search, products: [], error: requestError });
        }
      });

    return () => controller.abort();
  }, [search, storeError, storeLoading]);

  function submitSearch(event) {
    event.preventDefault();
    const nextSearch = new FormData(event.currentTarget).get("q").trim();
    setSearchParams(nextSearch ? { q: nextSearch } : {});
  }

  if (storeLoading) {
    return (
      <div className="page page-state" role="status">
        Opening the storefront…
      </div>
    );
  }

  if (storeError) {
    return (
      <section className="page page-state" role="alert">
        <p className="eyebrow">Store unavailable</p>
        <h1>We could not open this storefront.</h1>
        <p>{storeError.message}</p>
      </section>
    );
  }

  const defaultSections = [
    {
      type: "hero",
      eyebrow: "Powered by Mavera",
      title: store.name,
      description: store.tagline || "",
      ctaLabel: "Explore the collection",
      ctaHref: "#shop",
    },
    { type: "products", eyebrow: "Discover", title: "The collection" },
  ];
  const sections = store.settings.homepageSections ?? defaultSections;
  if (!Array.isArray(sections)) {
    return (
      <section className="page page-state" role="alert">
        <h1>This storefront needs an update.</h1>
        <p>The homepage section configuration is invalid.</p>
      </section>
    );
  }

  function safeSectionHref(value) {
    if (typeof value !== "string") return null;
    if (value.startsWith("#")) return value;
    if (value.startsWith("/") && !value.startsWith("//")) return value;
    return safePublicUrl(value);
  }

  return (
    <>
      {sections.map((section, index) => {
        if (section.type === "hero") {
          const ctaHref = safeSectionHref(section.ctaHref);
          const heroImage = safePublicUrl(section.imageUrl);
          return (
            <section className="home-hero" key={section.id || `hero-${index}`}>
              <div className="home-hero-copy">
                {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
                <h1>{section.title || store.name}</h1>
                {section.description && (
                  <p className="home-subtitle">{section.description}</p>
                )}
                {section.body && (
                  <p className="home-description">{section.body}</p>
                )}
                {section.ctaLabel && ctaHref && (
                  <a className="button button-dark" href={ctaHref}>
                    {section.ctaLabel}
                  </a>
                )}
              </div>
              {heroImage ? (
                <figure className="home-hero-visual">
                  <img
                    src={heroImage}
                    alt={section.imageAlt || ""}
                    fetchPriority="high"
                  />
                  {section.imageCaption && (
                    <figcaption>{section.imageCaption}</figcaption>
                  )}
                </figure>
              ) : (
                <div className="home-hero-mark" aria-hidden="true">
                  <span>{section.markLineOne || "Objects"}</span>
                  <span>{section.markLineTwo || "with"}</span>
                  <span>{section.markLineThree || "a story."}</span>
                  <i />
                </div>
              )}
            </section>
          );
        }
        if (section.type === "products") {
          return (
            <section
              className="page container"
              id={section.id || "shop"}
              key={section.id || `products-${index}`}
            >
              <div className="section-heading">
                <div>
                  {section.eyebrow && (
                    <p className="eyebrow">{section.eyebrow}</p>
                  )}
                  <h2>
                    {search
                      ? `Search results for “${search}”`
                      : section.title || "The collection"}
                  </h2>
                </div>
                <form
                  className="search-form"
                  role="search"
                  onSubmit={submitSearch}
                >
                  <label className="sr-only" htmlFor="product-search">
                    Search products
                  </label>
                  <input
                    id="product-search"
                    name="q"
                    type="search"
                    key={search}
                    defaultValue={search}
                    placeholder={section.searchPlaceholder || "Search the collection"}
                  />
                  <button type="submit" className="text-button">
                    Search
                  </button>
                </form>
              </div>

              {loading && (
                <p className="page-state" role="status">
                  Finding pieces…
                </p>
              )}
              {error && (
                <div className="inline-error" role="alert">
                  {error.message}
                </div>
              )}
              {!loading && !error && products.length === 0 && (
                <div className="empty-state">
                  <h3>
                    {search
                      ? "No pieces found"
                      : section.emptyTitle || "The collection is taking shape"}
                  </h3>
                  <p>
                    {search
                      ? "Try another maker, material, or product name."
                      : section.emptyMessage ||
                        "New work will appear here when the merchant publishes it."}
                  </p>
                </div>
              )}
              {!loading && !error && products.length > 0 && (
                <div className="product-grid">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currency={store.currency}
                      locale={store.locale}
                      storeName={store.name}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        }
        if (section.type === "statement") {
          const imageUrl = safePublicUrl(section.imageUrl);
          const secondaryImageUrl = safePublicUrl(section.secondaryImageUrl);
          return (
            <section
              className={`maker-note ${
                imageUrl || secondaryImageUrl ? "maker-note-with-images" : ""
              }`}
              key={section.id || `statement-${index}`}
            >
              <div className="maker-note-copy">
                {section.eyebrow && (
                  <p className="eyebrow">{section.eyebrow}</p>
                )}
                {section.title && <h2>{section.title}</h2>}
                {section.body && <p>{section.body}</p>}
              </div>
              {(imageUrl || secondaryImageUrl) && (
                <div className="maker-note-images">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={section.imageAlt || ""}
                      loading="lazy"
                    />
                  )}
                  {secondaryImageUrl && (
                    <img
                      src={secondaryImageUrl}
                      alt={section.secondaryImageAlt || ""}
                      loading="lazy"
                    />
                  )}
                </div>
              )}
            </section>
          );
        }
        return (
          <p className="inline-error" role="alert" key={`unknown-${index}`}>
            A homepage section could not be displayed.
          </p>
        );
      })}
    </>
  );
}

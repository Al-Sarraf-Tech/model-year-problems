// JSON-LD builders. Only facts from the NHTSA cache go in here: no ratings, no reviews.
export const absUrl = (site, p) => (String(p).startsWith("http") ? p : site.url.replace(/\/$/, "") + p);
export const jsonld = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

export function pageSchema(site, trail, title, desc, url, my, hub, faqs) {
  const org = { "@type": "Organization", "@id": `${site.url}/#org`, name: site.name, url: `${site.url}/`, logo: `${site.url}/assets/logo.svg`, email: site.contact };
  const web = { "@type": "WebSite", "@id": `${site.url}/#website`, name: site.name, url: `${site.url}/`, description: site.description, publisher: { "@id": `${site.url}/#org` }, inLanguage: "en-US",
    potentialAction: { "@type": "SearchAction", target: `${site.url}/search/?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  const graph = [org, web];
  if (trail.length > 1) graph.push({ "@type": "BreadcrumbList", itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, ...(c.url ? { item: absUrl(site, c.url) } : {}) })) });
  if (my) {
    graph.push({
      "@type": "Article", headline: title, description: desc, url: absUrl(site, url), dateModified: my.rec.checked, datePublished: my.rec.checked,
      author: { "@id": `${site.url}/#org` }, publisher: { "@id": `${site.url}/#org` }, inLanguage: "en-US",
      about: { "@type": "Car", name: my.name, brand: { "@type": "Brand", name: my.m.make }, model: my.m.model, vehicleModelDate: String(my.year) },
      isBasedOn: [my.rec.complaints_source_url, my.rec.recalls_source_url],
      citation: [my.rec.complaints_source_url, my.rec.recalls_source_url],
    });
  }
  if (hub) {
    graph.push({ "@type": "CollectionPage", name: title, description: desc, url: absUrl(site, url), dateModified: hub.checked, isPartOf: { "@id": `${site.url}/#website` } });
  }
  if (faqs?.length) graph.push({ "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  return { "@context": "https://schema.org", "@graph": graph };
}

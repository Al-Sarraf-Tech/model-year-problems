// JSON-LD builders. Only facts from the NHTSA cache go in here: no ratings, no reviews.
export const absUrl = (site, p) => (String(p).startsWith("http") ? p : site.url.replace(/\/$/, "") + p);
export const jsonld = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

export function pageSchema(site, trail, title, desc, url, my, hub, faqs, topic, mk) {
  const org = { "@type": "Organization", "@id": `${site.url}/#org`, name: site.name, url: `${site.url}/`, logo: `${site.url}/assets/logo.svg`, email: site.contact };
  const web = { "@type": "WebSite", "@id": `${site.url}/#website`, name: site.name, url: `${site.url}/`, description: site.description, publisher: { "@id": `${site.url}/#org` }, inLanguage: "en-US",
    potentialAction: { "@type": "SearchAction", target: `${site.url}/search/?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  const graph = [org, web];
  if (trail.length > 1) graph.push({ "@type": "BreadcrumbList", itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, ...(c.url ? { item: absUrl(site, c.url) } : {}) })) });
  // dateModified is the day the cited NHTSA files were checked. There is no separate
  // first-published date in the cache, so datePublished is omitted rather than copied
  // from the check date.
  if (my) {
    graph.push({
      "@type": "Article", headline: title, description: desc, url: absUrl(site, url), mainEntityOfPage: absUrl(site, url), dateModified: my.rec.checked,
      author: { "@id": `${site.url}/#org` }, publisher: { "@id": `${site.url}/#org` }, inLanguage: "en-US",
      about: { "@type": "Car", name: my.name, brand: { "@type": "Brand", name: my.m.make }, model: my.m.model, vehicleModelDate: String(my.year) },
      isBasedOn: [my.rec.complaints_source_url, my.rec.recalls_source_url],
      citation: [my.rec.complaints_source_url, my.rec.recalls_source_url],
    });
  }
  if (topic) {
    graph.push({
      "@type": "Article", headline: title, description: desc, url: absUrl(site, url), mainEntityOfPage: absUrl(site, url), dateModified: topic.checked,
      author: { "@id": `${site.url}/#org` }, publisher: { "@id": `${site.url}/#org` }, inLanguage: "en-US",
      about: { "@type": "Car", name: topic.name, brand: { "@type": "Brand", name: topic.m.make }, model: topic.m.model },
      isBasedOn: topic.sourceUrls, citation: topic.sourceUrls,
    });
  }
  const collection = hub || mk;
  if (collection) {
    graph.push({ "@type": "CollectionPage", name: title, description: desc, url: absUrl(site, url), dateModified: collection.checked, isPartOf: { "@id": `${site.url}/#website` } });
  }
  if (faqs?.length) graph.push({ "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  return { "@context": "https://schema.org", "@graph": graph };
}

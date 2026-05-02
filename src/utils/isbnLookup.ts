export interface ISBNLookupResult {
  title: string;
  publisher: string;
  authors: string[];
  edition: string;
  success: boolean;
  message: string;
}

export const lookupISBN = async (isbn: string): Promise<ISBNLookupResult> => {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  
  let foundTitle = '';
  let foundPublisher = '';
  let foundEdition = '';
  let authors: string[] = [];

  const updateFoundData = (title: string, publisher: string, edition: string, newAuthors: string[]) => {
    if (!foundTitle && title) foundTitle = title;
    // Prefer longer, more descriptive titles if we already have one, but only if they seem to add subtitle
    else if (foundTitle && title && title.length > foundTitle.length && title.includes(foundTitle)) foundTitle = title;

    if (!foundPublisher && publisher) foundPublisher = publisher;
    if (!foundEdition && edition) foundEdition = edition;
    if (authors.length === 0 && newAuthors && newAuthors.length > 0) authors = newAuthors;
  };

  try {
    const promises = [
      // Google Books API
      fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`).then(res => res.json()).catch(() => null),
      
      // OpenLibrary Data API
      fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`).then(res => res.json()).catch(() => null),
      
      // OpenLibrary Details API
      fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=details`).then(res => res.json()).catch(() => null),
      
      // OpenLibrary ISBN endpoint
      fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`).then(res => res.json()).catch(() => null)
    ];

    const [googleData, olData, olDetails, olIsbnData] = await Promise.all(promises);

    // 1. Process Google Books
    if (googleData && googleData.items && googleData.items.length > 0) {
      const info = googleData.items[0].volumeInfo;
      let title = info.title || '';
      if (title && info.subtitle) {
        title += `: ${info.subtitle}`;
      }
      updateFoundData(title, info.publisher || '', '', info.authors || []);
    }

    // 2. Process OpenLibrary Data endpoint
    const olKey = `ISBN:${cleanIsbn}`;
    if (olData && olData[olKey]) {
      const data = olData[olKey];
      let title = data.title || '';
      if (title && data.subtitle) {
        title += `: ${data.subtitle}`;
      }
      const publisher = data.publishers ? data.publishers.map((p: any) => p.name).join(', ') : '';
      const dataAuthors = data.authors ? data.authors.map((a: any) => a.name) : [];
      updateFoundData(title, publisher, '', dataAuthors);
    }

    // 3. Process OpenLibrary Details endpoint
    if (olDetails && olDetails[olKey] && olDetails[olKey].details) {
      const details = olDetails[olKey].details;
      let title = details.title || '';
      if (title && details.subtitle) {
        title += `: ${details.subtitle}`;
      }
      const publisher = details.publishers && details.publishers.length > 0 ? details.publishers.join(', ') : '';
      let edition = '';
      if (details.edition_name) {
        edition = details.edition_name;
      } else if (details.revision) {
        edition = `Rev ${details.revision}`;
      }
      
      const detailsAuthors = details.authors ? details.authors.map((a: any) => a.name || '') : [];
      updateFoundData(title, publisher, edition, detailsAuthors.filter(Boolean));
    }

    // 4. Process OpenLibrary native ISBN endpoint
    if (olIsbnData && !olIsbnData.error) {
      let title = olIsbnData.title || '';
      if (title && olIsbnData.subtitle) {
        title += `: ${olIsbnData.subtitle}`;
      }
      const publisher = olIsbnData.publishers && olIsbnData.publishers.length > 0 ? olIsbnData.publishers.join(', ') : '';
      
      updateFoundData(title, publisher, olIsbnData.edition_name || '', []);
    }

    if (foundTitle) {
      let finalTitle = foundTitle;
      if (foundEdition && !finalTitle.toLowerCase().includes('edition')) {
        finalTitle += ` (${foundEdition})`;
      }
      
      return {
        success: true,
        title: finalTitle,
        publisher: foundPublisher,
        edition: foundEdition,
        authors: authors,
        message: `Found: ${finalTitle.substring(0, 25)}${finalTitle.length > 25 ? '...' : ''}`
      };
    } else {
      return {
        success: false,
        title: '',
        publisher: '',
        edition: '',
        authors: [],
        message: 'ISBN not found in databases'
      };
    }

  } catch (err) {
    console.error("ISBN Lookup Error:", err);
    return {
      success: false,
      title: '',
      publisher: '',
      edition: '',
      authors: [],
      message: 'Lookup failed. Please check connection.'
    };
  }
};

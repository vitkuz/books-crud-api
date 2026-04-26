export type SeedBook = {
  title: string;
  author: string;
  year: number;
  categories: string[];
};

export const seedCategories: string[] = [
  'Fiction',
  'Science Fiction',
  'Fantasy',
  'Philosophy',
  'Poetry',
  'History',
  'Mystery',
  'Memoir',
  'Essays',
  'Short Stories',
];

export const seedAuthors: string[] = [
  'Ursula K. Le Guin',
  'Italo Calvino',
  'Jorge Luis Borges',
  'Toni Morrison',
  'Haruki Murakami',
  'Olga Tokarczuk',
  'Cormac McCarthy',
  'Marilynne Robinson',
  'Gabriel García Márquez',
  'Margaret Atwood',
  'James Baldwin',
  'Annie Dillard',
  'Joan Didion',
  'W. G. Sebald',
  'Roberto Bolaño',
];

export const seedBooks: SeedBook[] = [
  // Le Guin
  { title: 'The Dispossessed',           author: 'Ursula K. Le Guin',     year: 1974, categories: ['Science Fiction', 'Fiction'] },
  { title: 'A Wizard of Earthsea',       author: 'Ursula K. Le Guin',     year: 1968, categories: ['Fantasy', 'Fiction'] },
  { title: 'The Left Hand of Darkness',  author: 'Ursula K. Le Guin',     year: 1969, categories: ['Science Fiction', 'Fiction'] },

  // Calvino
  { title: 'Invisible Cities',           author: 'Italo Calvino',         year: 1972, categories: ['Fiction', 'Short Stories'] },
  { title: "If on a winter's night a traveler", author: 'Italo Calvino',  year: 1979, categories: ['Fiction'] },
  { title: 'Cosmicomics',                author: 'Italo Calvino',         year: 1965, categories: ['Science Fiction', 'Short Stories'] },

  // Borges
  { title: 'Ficciones',                  author: 'Jorge Luis Borges',     year: 1944, categories: ['Short Stories', 'Fiction'] },
  { title: 'Labyrinths',                 author: 'Jorge Luis Borges',     year: 1962, categories: ['Short Stories', 'Philosophy'] },

  // Morrison
  { title: 'Beloved',                    author: 'Toni Morrison',         year: 1987, categories: ['Fiction'] },
  { title: 'Song of Solomon',            author: 'Toni Morrison',         year: 1977, categories: ['Fiction'] },

  // Murakami
  { title: 'Kafka on the Shore',         author: 'Haruki Murakami',       year: 2002, categories: ['Fiction'] },
  { title: 'Norwegian Wood',             author: 'Haruki Murakami',       year: 1987, categories: ['Fiction'] },
  { title: '1Q84',                       author: 'Haruki Murakami',       year: 2009, categories: ['Fiction', 'Fantasy'] },

  // Tokarczuk
  { title: 'Flights',                    author: 'Olga Tokarczuk',        year: 2007, categories: ['Fiction', 'Essays'] },
  { title: 'The Books of Jacob',         author: 'Olga Tokarczuk',        year: 2014, categories: ['Fiction', 'History'] },

  // McCarthy
  { title: 'Blood Meridian',             author: 'Cormac McCarthy',       year: 1985, categories: ['Fiction'] },
  { title: 'The Road',                   author: 'Cormac McCarthy',       year: 2006, categories: ['Fiction'] },

  // Robinson
  { title: 'Gilead',                     author: 'Marilynne Robinson',    year: 2004, categories: ['Fiction'] },
  { title: 'Housekeeping',               author: 'Marilynne Robinson',    year: 1980, categories: ['Fiction'] },

  // García Márquez
  { title: 'One Hundred Years of Solitude', author: 'Gabriel García Márquez', year: 1967, categories: ['Fiction'] },
  { title: 'Love in the Time of Cholera', author: 'Gabriel García Márquez', year: 1985, categories: ['Fiction'] },

  // Atwood
  { title: "The Handmaid's Tale",        author: 'Margaret Atwood',       year: 1985, categories: ['Science Fiction', 'Fiction'] },
  { title: 'Alias Grace',                author: 'Margaret Atwood',       year: 1996, categories: ['Fiction', 'History', 'Mystery'] },

  // Baldwin
  { title: "Giovanni's Room",            author: 'James Baldwin',         year: 1956, categories: ['Fiction'] },
  { title: 'The Fire Next Time',         author: 'James Baldwin',         year: 1963, categories: ['Essays'] },

  // Dillard
  { title: 'Pilgrim at Tinker Creek',    author: 'Annie Dillard',         year: 1974, categories: ['Essays', 'Memoir'] },

  // Didion
  { title: 'The Year of Magical Thinking', author: 'Joan Didion',         year: 2005, categories: ['Memoir'] },
  { title: 'Slouching Towards Bethlehem', author: 'Joan Didion',          year: 1968, categories: ['Essays'] },

  // Sebald
  { title: 'Austerlitz',                 author: 'W. G. Sebald',          year: 2001, categories: ['Fiction', 'Memoir'] },
  { title: 'The Rings of Saturn',        author: 'W. G. Sebald',          year: 1995, categories: ['Fiction', 'Essays'] },

  // Bolaño
  { title: '2666',                       author: 'Roberto Bolaño',        year: 2004, categories: ['Fiction', 'Mystery'] },
  { title: 'The Savage Detectives',      author: 'Roberto Bolaño',        year: 1998, categories: ['Fiction'] },
];

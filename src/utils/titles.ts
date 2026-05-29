// Profile titles. Each title has an unlock predicate; a title is
// "available" when its predicate returns true given the user's stats.
//
// The selected title id is persisted on the user (users.preferred_title).
// Unlocked-state is derived live from library + comments — nothing about
// unlocks is stored, so titles stay honest with current data.

import type { LibraryItemServer } from '../types'

export interface UserStats {
  totalLibrary: number
  totalCompleted: number
  completedMovies: number
  completedSeries: number
  completedGames: number
  completedBooks: number
  completedAnimes: number
  likedCount: number
  totalComments: number
  isAdmin: boolean
}

export interface Title {
  id: string
  label: string
  /** Minimal glyph shown before the label. Keep it a single character. */
  emoji: string
  description: string
  /** CSS background value for the badge. Keep dark and desaturated. */
  color: string
  unlock: (s: UserStats) => boolean
}

// ─── Color tokens ────────────────────────────────────────────────────────────
// All backgrounds are intentionally dark so white text stays readable without
// decoration. Accents are used sparingly — one per category family.

const C = {
  // Neutrals
  base:    '#181818',
  member:  '#1e1e22',
  admin:   'linear-gradient(135deg, #0a1a2e 0%, #0d2a46 100%)',

  // Movies — cold violet
  mov1: '#1a1228',
  mov2: '#201530',
  mov3: 'linear-gradient(135deg, #1a1028 0%, #281540 100%)',
  mov4: 'linear-gradient(135deg, #1e1030 0%, #30184c 100%)',
  mov5: 'linear-gradient(135deg, #180e28 0%, #38186a 100%)',

  // Series — deep crimson
  ser1: '#221010',
  ser2: '#2a1212',
  ser3: 'linear-gradient(135deg, #221010 0%, #3a1010 100%)',
  ser4: 'linear-gradient(135deg, #281010 0%, #4a1212 100%)',
  ser5: 'linear-gradient(135deg, #200808 0%, #5a0e0e 100%)',

  // Games — dark teal
  gam1: '#0e1e18',
  gam2: '#10241e',
  gam3: 'linear-gradient(135deg, #0e1e18 0%, #143020 100%)',
  gam4: 'linear-gradient(135deg, #0c1e16 0%, #163a22 100%)',
  gam5: 'linear-gradient(135deg, #0a1a14 0%, #0e4020 100%)',

  // Animes — deep rose
  ani1: '#221020',
  ani2: '#2a1228',
  ani3: 'linear-gradient(135deg, #221020 0%, #38103a 100%)',
  ani4: 'linear-gradient(135deg, #201020 0%, #481048 100%)',
  ani5: 'linear-gradient(135deg, #1e0e1e 0%, #560e5a 100%)',

  // Books — dark ink
  boo1: '#10101e',
  boo2: '#141424',
  boo3: 'linear-gradient(135deg, #10101e 0%, #181830 100%)',
  boo4: 'linear-gradient(135deg, #0e0e1e 0%, #1c1c3a 100%)',

  // Cross-category / social — slate
  crs1: 'linear-gradient(135deg, #121820 0%, #1a2430 100%)',
  crs2: 'linear-gradient(135deg, #101820 0%, #1e2c3c 100%)',
  crs3: 'linear-gradient(135deg, #0e1620 0%, #243040 100%)',
  soc1: '#141a1e',
  soc2: 'linear-gradient(135deg, #101820 0%, #162030 100%)',
  soc3: 'linear-gradient(135deg, #0e1618 0%, #1a2a30 100%)',

  // Liked / curator — dark burgundy
  cur1: '#1e1018',
  cur2: 'linear-gradient(135deg, #1e1018 0%, #2c1028 100%)',
  cur3: 'linear-gradient(135deg, #1c0e18 0%, #380e30 100%)',
}

// ─── Glyphs ───────────────────────────────────────────────────────────────────
// One-character marks. Roman numerals for tiers, special symbols for rare/social.
const G = {
  i: 'Ⅰ', ii: 'Ⅱ', iii: 'Ⅲ', iv: 'Ⅳ', v: 'Ⅴ',
  diamond: '◆', cross: '◈', dot: '·', star: '★', circle: '◉',
}

// ─── Title list ───────────────────────────────────────────────────────────────

export const TITLES: Title[] = [

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    id: 'admin',
    label: 'Admin',
    emoji: G.star,
    description: 'Administrador do Abyss',
    color: C.admin,
    unlock: (s) => s.isAdmin,
  },

  // ── Padrão ────────────────────────────────────────────────────────────────
  {
    id: 'member',
    label: 'Membro do Abyss',
    emoji: G.dot,
    description: 'Bem-vindo ao Abyss',
    color: C.member,
    unlock: () => true,
  },

  // ── Filmes ────────────────────────────────────────────────────────────────
  {
    id: 'cinephile_jr',
    label: 'Espectador',
    emoji: G.i,
    description: 'Assista 3 filmes',
    color: C.mov1,
    unlock: (s) => s.completedMovies >= 3,
  },
  {
    id: 'cinephile',
    label: 'Cinéfilo',
    emoji: G.ii,
    description: 'Assista 10 filmes',
    color: C.mov2,
    unlock: (s) => s.completedMovies >= 10,
  },
  {
    id: 'movie_buff',
    label: 'Mestre do Cinema',
    emoji: G.iii,
    description: 'Assista 25 filmes',
    color: C.mov3,
    unlock: (s) => s.completedMovies >= 25,
  },
  {
    id: 'archivist_film',
    label: 'Arquivista',
    emoji: G.iv,
    description: 'Assista 50 filmes',
    color: C.mov4,
    unlock: (s) => s.completedMovies >= 50,
  },
  {
    id: 'encyclopedist',
    label: 'Enciclopédia',
    emoji: G.v,
    description: 'Assista 100 filmes',
    color: C.mov5,
    unlock: (s) => s.completedMovies >= 100,
  },

  // ── Séries ────────────────────────────────────────────────────────────────
  {
    id: 'binge_jr',
    label: 'Maratonista',
    emoji: G.i,
    description: 'Assista 3 séries',
    color: C.ser1,
    unlock: (s) => s.completedSeries >= 3,
  },
  {
    id: 'binge_watcher',
    label: 'Binge Watcher',
    emoji: G.ii,
    description: 'Assista 10 séries',
    color: C.ser2,
    unlock: (s) => s.completedSeries >= 10,
  },
  {
    id: 'serialist',
    label: 'Serialista',
    emoji: G.iii,
    description: 'Assista 20 séries',
    color: C.ser3,
    unlock: (s) => s.completedSeries >= 20,
  },
  {
    id: 'chronicler',
    label: 'Cronista',
    emoji: G.iv,
    description: 'Assista 40 séries',
    color: C.ser4,
    unlock: (s) => s.completedSeries >= 40,
  },
  {
    id: 'living_archive',
    label: 'Arquivo Vivo',
    emoji: G.v,
    description: 'Assista 75 séries',
    color: C.ser5,
    unlock: (s) => s.completedSeries >= 75,
  },

  // ── Jogos ─────────────────────────────────────────────────────────────────
  {
    id: 'gamer_jr',
    label: 'Gamer',
    emoji: G.i,
    description: 'Conclua 3 jogos',
    color: C.gam1,
    unlock: (s) => s.completedGames >= 3,
  },
  {
    id: 'pro_gamer',
    label: 'Pro Gamer',
    emoji: G.ii,
    description: 'Conclua 10 jogos',
    color: C.gam2,
    unlock: (s) => s.completedGames >= 10,
  },
  {
    id: 'speedrunner',
    label: 'Speedrunner',
    emoji: G.iii,
    description: 'Conclua 25 jogos',
    color: C.gam3,
    unlock: (s) => s.completedGames >= 25,
  },
  {
    id: 'platinador',
    label: 'Platinador',
    emoji: G.iv,
    description: 'Conclua 50 jogos',
    color: C.gam4,
    unlock: (s) => s.completedGames >= 50,
  },
  {
    id: 'save_archive',
    label: 'Arquivo de Save',
    emoji: G.v,
    description: 'Conclua 100 jogos',
    color: C.gam5,
    unlock: (s) => s.completedGames >= 100,
  },

  // ── Animes ────────────────────────────────────────────────────────────────
  {
    id: 'otaku_jr',
    label: 'Otaku',
    emoji: G.i,
    description: 'Assista 3 animes',
    color: C.ani1,
    unlock: (s) => s.completedAnimes >= 3,
  },
  {
    id: 'weeb',
    label: 'Weeb',
    emoji: G.ii,
    description: 'Assista 10 animes',
    color: C.ani2,
    unlock: (s) => s.completedAnimes >= 10,
  },
  {
    id: 'sensei',
    label: 'Sensei',
    emoji: G.iii,
    description: 'Assista 25 animes',
    color: C.ani3,
    unlock: (s) => s.completedAnimes >= 25,
  },
  {
    id: 'animation_chronicler',
    label: 'Cronista da Animação',
    emoji: G.iv,
    description: 'Assista 50 animes',
    color: C.ani4,
    unlock: (s) => s.completedAnimes >= 50,
  },
  {
    id: 'visual_archivist',
    label: 'Arquivista Visual',
    emoji: G.v,
    description: 'Assista 100 animes',
    color: C.ani5,
    unlock: (s) => s.completedAnimes >= 100,
  },

  // ── Livros ────────────────────────────────────────────────────────────────
  {
    id: 'reader_jr',
    label: 'Leitor',
    emoji: G.i,
    description: 'Leia 3 livros',
    color: C.boo1,
    unlock: (s) => s.completedBooks >= 3,
  },
  {
    id: 'bookworm',
    label: 'Rato de Biblioteca',
    emoji: G.ii,
    description: 'Leia 10 livros',
    color: C.boo2,
    unlock: (s) => s.completedBooks >= 10,
  },
  {
    id: 'bibliophile',
    label: 'Bibliófilo',
    emoji: G.iii,
    description: 'Leia 25 livros',
    color: C.boo3,
    unlock: (s) => s.completedBooks >= 25,
  },
  {
    id: 'knowledge_keeper',
    label: 'Guardião do Conhecimento',
    emoji: G.iv,
    description: 'Leia 50 livros',
    color: C.boo4,
    unlock: (s) => s.completedBooks >= 50,
  },

  // ── Cross-categoria ───────────────────────────────────────────────────────
  {
    id: 'completionist',
    label: 'Completista',
    emoji: G.cross,
    description: 'Conclua itens em todas as categorias',
    color: C.crs1,
    unlock: (s) =>
      s.completedMovies > 0 && s.completedSeries > 0 && s.completedGames > 0
      && s.completedBooks > 0 && s.completedAnimes > 0,
  },
  {
    id: 'collector',
    label: 'Colecionador',
    emoji: G.cross,
    description: '50+ itens na biblioteca',
    color: C.crs1,
    unlock: (s) => s.totalLibrary >= 50,
  },
  {
    id: 'veteran',
    label: 'Veterano',
    emoji: G.cross,
    description: '100+ itens concluídos',
    color: C.crs2,
    unlock: (s) => s.totalCompleted >= 100,
  },
  {
    id: 'elite_curator',
    label: 'Curador de Elite',
    emoji: G.diamond,
    description: '200+ itens na biblioteca',
    color: C.crs3,
    unlock: (s) => s.totalLibrary >= 200,
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    id: 'critic',
    label: 'Crítico',
    emoji: G.circle,
    description: 'Escreva 5 comentários',
    color: C.soc1,
    unlock: (s) => s.totalComments >= 5,
  },
  {
    id: 'opinion_leader',
    label: 'Formador de Opinião',
    emoji: G.circle,
    description: 'Escreva 20 comentários',
    color: C.soc2,
    unlock: (s) => s.totalComments >= 20,
  },
  {
    id: 'analyst',
    label: 'Analista',
    emoji: G.circle,
    description: 'Escreva 50 comentários',
    color: C.soc2,
    unlock: (s) => s.totalComments >= 50,
  },
  {
    id: 'voice_of_abyss',
    label: 'Voz do Abyss',
    emoji: G.circle,
    description: 'Escreva 100 comentários',
    color: C.soc3,
    unlock: (s) => s.totalComments >= 100,
  },

  // ── Curadoria ─────────────────────────────────────────────────────────────
  {
    id: 'curator',
    label: 'Curador',
    emoji: G.diamond,
    description: 'Marque 10 itens como gostei',
    color: C.cur1,
    unlock: (s) => s.likedCount >= 10,
  },
  {
    id: 'taste_archivist',
    label: 'Arquivista de Gosto',
    emoji: G.diamond,
    description: 'Marque 25 itens como gostei',
    color: C.cur2,
    unlock: (s) => s.likedCount >= 25,
  },
  {
    id: 'definitive_curator',
    label: 'Curador Definitivo',
    emoji: G.diamond,
    description: 'Marque 50 itens como gostei',
    color: C.cur3,
    unlock: (s) => s.likedCount >= 50,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function computeStats(library: LibraryItemServer[], totalComments: number, isAdmin: boolean): UserStats {
  const completed = library.filter((l) => l.status === 'completed')
  return {
    totalLibrary:     library.length,
    totalCompleted:   completed.length,
    completedMovies:  completed.filter((l) => l.category === 'movies').length,
    completedSeries:  completed.filter((l) => l.category === 'series').length,
    completedGames:   completed.filter((l) => (l.category as string) === 'games').length,
    completedBooks:   completed.filter((l) => l.category === 'books').length,
    completedAnimes:  completed.filter((l) => l.category === 'animes').length,
    likedCount:       library.filter((l) => l.liked).length,
    totalComments,
    isAdmin,
  }
}

export function unlockedTitles(stats: UserStats): Title[] {
  return TITLES.filter((t) => t.unlock(stats))
}

export function getTitle(id: string | null): Title | undefined {
  if (!id) return undefined
  return TITLES.find((t) => t.id === id)
}

export function defaultTitle(stats: UserStats): Title {
  if (stats.isAdmin) return TITLES.find((t) => t.id === 'admin')!
  return TITLES.find((t) => t.id === 'member')!
}

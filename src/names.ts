import { Species } from "./types";

// Every individual aboard gets a given name, drawn from a per-species pool that
// fits their culture (humans plain, Drenn mercantile-melodic, Thol guttural, etc.).
// Picked deterministically from the agent's id so saves stay stable.
const POOLS: Record<Species, string[]> = {
  human: ["Mara", "Dane", "Iris", "Cole", "Vega", "Niko", "Sasha", "Rourke", "Lena", "Tobias", "Quinn", "Esra", "Wyatt", "Nadia", "Cyrus", "Petra"],
  drenn: ["Ozzo", "Vella", "Brixx", "Solenne", "Pim", "Coraz", "Nyx", "Dalla", "Reno", "Sib", "Ovari", "Tazz", "Lumi", "Garo", "Fenn", "Yarrow"],
  thol: ["Grok", "Brunt", "Vohl", "Tharn", "Mogg", "Drub", "Skoll", "Garruk", "Orrm", "Heft", "Brak", "Voss", "Dorn", "Grell", "Krong", "Thudd"],
  vryl: ["Sither", "Lumel", "Pollun", "Ysha", "Mossin", "Velith", "Sporra", "Niah", "Thali", "Wyn", "Olune", "Sephi", "Lirr", "Fenwick", "Mira", "Quill"],
  korro: ["Vrang", "Dura", "Kael", "Brommo", "Hadd", "Surt", "Grava", "Torrek", "Mun", "Drosk", "Borr", "Kesh", "Varn", "Ogun", "Threk", "Hulda"],
  vorn: ["Mizza", "Korval", "Pell", "Suvi", "Drazz", "Onno", "Yett", "Larsk", "Bovo", "Renza", "Quor", "Tibb", "Vask", "Olm", "Cazz", "Furl"],
  chlorithe: ["Klyx", "Sythe", "Veqar", "Thysa", "Crylix", "Ozun", "Phex", "Nylith", "Quasz", "Vraal", "Skern", "Yxil", "Brask", "Cthune", "Lyss", "Orvex"],
  naaz: ["Aelu", "Soomi", "Naya", "Velo", "Iomi", "Suun", "Aluri", "Pael", "Yumo", "Senua", "Olwe", "Aami", "Losu", "Nehl", "Iree", "Womi"],
  voltaar: ["Zyn", "Arc", "Volk", "Tezza", "Ohm", "Sparr", "Vael", "Ixen", "Joule", "Krell", "Zeth", "Pyre", "Volta", "Nyx", "Surge", "Ember"],
  sszra: ["Ssarn", "Veksa", "Zhirr", "Ssoth", "Karza", "Vex", "Sszik", "Drassa", "Nyssk", "Ozzra", "Thessa", "Skarr", "Vissk", "Ssel", "Korzz", "Aszna"],
};

export function nameFor(species: Species, seed: number): string {
  const pool = POOLS[species] ?? POOLS.human;
  return pool[Math.abs(seed) % pool.length];
}

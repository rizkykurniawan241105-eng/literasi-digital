import { Book } from '../types';

// Dihapus seluruh data dummy buku statis bawaan (Laskar Pelangi, Bumi Manusia, dll)
// Katalog e-book murni bersumber dari koleksi Firestore 'books' yang diunggah Admin.
export const INITIAL_SEED_BOOKS: Omit<Book, 'id'>[] = [];

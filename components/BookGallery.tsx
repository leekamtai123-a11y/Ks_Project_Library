
import React from 'react';
import { Book } from '../types';
import BookCard from './BookCard';

interface BookGalleryProps {
  books: Book[];
  onSelectBook: (id: string) => void;
}

const BookGallery: React.FC<BookGalleryProps> = ({ books, onSelectBook }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
      {books.map(book => (
        <BookCard 
          key={book.id} 
          book={book} 
          onClick={() => onSelectBook(book.id)} 
        />
      ))}
    </div>
  );
};

export default BookGallery;

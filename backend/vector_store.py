"""
Vector Store Module
In-memory vector store using TF-IDF + cosine similarity for semantic search.
No external embedding model needed — lightweight and fast.
"""

import re
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple

from document_parser import DocumentChunk


@dataclass
class SearchResult:
    """A search result with relevance score."""
    chunk: DocumentChunk
    score: float
    rank: int


class VectorStore:
    """
    Lightweight in-memory vector store using TF-IDF for document search.
    No external dependencies needed — uses pure Python.
    """

    def __init__(self):
        self.documents: Dict[str, List[DocumentChunk]] = {}  # doc_id -> chunks
        self.idf: Dict[str, float] = {}
        self.tfidf_vectors: Dict[str, List[Dict[str, float]]] = {}  # doc_id -> list of tfidf dicts
        self._total_chunks = 0

    def add_document(self, doc_id: str, chunks: List[DocumentChunk]):
        """Add document chunks to the store and build TF-IDF index."""
        self.documents[doc_id] = chunks
        self._rebuild_index()

    def remove_document(self, doc_id: str):
        """Remove a document from the store."""
        if doc_id in self.documents:
            del self.documents[doc_id]
            if doc_id in self.tfidf_vectors:
                del self.tfidf_vectors[doc_id]
            self._rebuild_index()

    def search(self, query: str, top_k: int = 5, doc_id: Optional[str] = None) -> List[SearchResult]:
        """Search for the most relevant chunks given a query."""
        if not self.documents:
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        # Build query TF-IDF vector
        query_tf = self._compute_tf(query_tokens)
        query_vector = {term: tf * self.idf.get(term, 0) for term, tf in query_tf.items()}

        results = []

        # Search across selected documents
        search_docs = {doc_id: self.documents[doc_id]} if doc_id and doc_id in self.documents else self.documents

        for d_id, chunks in search_docs.items():
            if d_id not in self.tfidf_vectors:
                continue
            for i, chunk_vector in enumerate(self.tfidf_vectors[d_id]):
                score = self._cosine_similarity(query_vector, chunk_vector)
                if score > 0.01:  # minimum relevance threshold
                    results.append(SearchResult(
                        chunk=chunks[i],
                        score=score,
                        rank=0
                    ))

        # Sort by score descending
        results.sort(key=lambda r: r.score, reverse=True)

        # Assign ranks
        for i, result in enumerate(results[:top_k]):
            result.rank = i + 1

        return results[:top_k]

    def get_document_ids(self) -> List[str]:
        """Return all stored document IDs."""
        return list(self.documents.keys())

    def get_document_chunks(self, doc_id: str) -> List[DocumentChunk]:
        """Return chunks for a specific document."""
        return self.documents.get(doc_id, [])

    def _rebuild_index(self):
        """Rebuild the TF-IDF index for all documents."""
        # Collect all tokenized chunks
        all_chunk_tokens = []
        chunk_map = []  # (doc_id, chunk_index)

        for doc_id, chunks in self.documents.items():
            for i, chunk in enumerate(chunks):
                tokens = self._tokenize(chunk.text)
                all_chunk_tokens.append(tokens)
                chunk_map.append((doc_id, i))

        self._total_chunks = len(all_chunk_tokens)

        if self._total_chunks == 0:
            return

        # Compute IDF
        doc_freq = defaultdict(int)
        for tokens in all_chunk_tokens:
            unique_tokens = set(tokens)
            for token in unique_tokens:
                doc_freq[token] += 1

        self.idf = {
            term: math.log(self._total_chunks / (1 + freq))
            for term, freq in doc_freq.items()
        }

        # Compute TF-IDF vectors per chunk
        self.tfidf_vectors = defaultdict(list)
        for idx, tokens in enumerate(all_chunk_tokens):
            doc_id, chunk_idx = chunk_map[idx]
            tf = self._compute_tf(tokens)
            tfidf = {term: tf_val * self.idf.get(term, 0) for term, tf_val in tf.items()}

            # Ensure list is long enough
            while len(self.tfidf_vectors[doc_id]) <= chunk_idx:
                self.tfidf_vectors[doc_id].append({})
            self.tfidf_vectors[doc_id][chunk_idx] = tfidf

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Tokenize text into lowercase words."""
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        tokens = text.split()
        # Remove very short tokens and common stop words
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                       'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                       'would', 'could', 'should', 'may', 'might', 'can', 'shall',
                       'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
                       'as', 'into', 'through', 'during', 'before', 'after',
                       'and', 'but', 'or', 'nor', 'not', 'so', 'yet',
                       'it', 'its', 'this', 'that', 'these', 'those',
                       'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she',
                       'him', 'her', 'they', 'them', 'their', 'what', 'which'}
        return [t for t in tokens if len(t) > 1 and t not in stop_words]

    @staticmethod
    def _compute_tf(tokens: List[str]) -> Dict[str, float]:
        """Compute term frequency."""
        counter = Counter(tokens)
        total = len(tokens) if tokens else 1
        return {term: count / total for term, count in counter.items()}

    @staticmethod
    def _cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
        """Compute cosine similarity between two sparse vectors."""
        if not vec_a or not vec_b:
            return 0.0

        # Dot product
        common_terms = set(vec_a.keys()) & set(vec_b.keys())
        if not common_terms:
            return 0.0

        dot = sum(vec_a[t] * vec_b[t] for t in common_terms)

        # Magnitudes
        mag_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
        mag_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))

        if mag_a == 0 or mag_b == 0:
            return 0.0

        return dot / (mag_a * mag_b)


# Global vector store instance
vector_store = VectorStore()

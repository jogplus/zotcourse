from zotcourse import util
from rapidfuzz import process, fuzz


class RatingData:
    def __init__(self, rating_cache=dict()):
        self.cache_updated = False
        self.ratings = rating_cache

    def get_rating(self, raw_name):
        name = util.clean_name(raw_name)
        rating = self.ratings.get(name)
        if rating is None and self.ratings:
            match = process.extractOne(
                name,
                set(self.ratings.keys()),
                score_cutoff=90,
                scorer=fuzz.token_sort_ratio,
            )
            if match:
                rating = self.ratings[match[0]]
                self.ratings[name] = rating
            else:
                self.ratings[name] = False
            self.cache_updated = True
        if not rating:
            rating = None
        return rating

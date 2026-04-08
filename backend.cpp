#include <algorithm>
#include <cmath>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>


/**
 * Song Recommendation System - Backend Console App
 * Features: AVL Tree, Inheritance, Function Overloading, Overriding, File I/O
 */

// 1. Storage Class
class Song {
public:
  int id;
  std::string name;
  std::string artist;
  std::string genre;
  float rating;

  // Helper to return song data as a JSON string for the Node.js bridge
  std::string toJson() const {
    std::string json = "{";
    json += "\"id\":" + std::to_string(id) + ",";
    json += "\"name\":\"" + name + "\",";
    json += "\"artist\":\"" + artist + "\",";
    json += "\"genre\":\"" + genre + "\",";
    json += "\"rating\":" + std::to_string(rating);
    json += "}";
    return json;
  }
};

// 2. AVL Tree Structure
struct Node {
  Song data;
  Node *left;
  Node *right;
  int height;
};

// Application State
Node *root = nullptr;
std::vector<Song> allSongs;

// --- AVL TREE LOGIC ---

int getHeight(Node *n) { return n ? n->height : 0; }

int getBalance(Node *n) {
  return n ? (getHeight(n->left) - getHeight(n->right)) : 0;
}

Node *rightRotate(Node *y) {
  Node *x = y->left;
  Node *T2 = x->right;
  x->right = y;
  y->left = T2;
  y->height = std::max(getHeight(y->left), getHeight(y->right)) + 1;
  x->height = std::max(getHeight(x->left), getHeight(x->right)) + 1;
  return x;
}

Node *leftRotate(Node *x) {
  Node *y = x->right;
  Node *T2 = y->left;
  y->left = x;
  x->right = T2;
  x->height = std::max(getHeight(x->left), getHeight(x->right)) + 1;
  y->height = std::max(getHeight(y->left), getHeight(y->right)) + 1;
  return y;
}

Node *insertNode(Node *node, const Song &s) {
  if (!node) {
    Node *newNode = new Node();
    newNode->data = s;
    newNode->left = newNode->right = nullptr;
    newNode->height = 1;
    return newNode;
  }
  if (s.id < node->data.id)
    node->left = insertNode(node->left, s);
  else if (s.id > node->data.id)
    node->right = insertNode(node->right, s);
  else
    return node;

  node->height = 1 + std::max(getHeight(node->left), getHeight(node->right));
  int balance = getBalance(node);

  // LL Case
  if (balance > 1 && s.id < node->left->data.id)
    return rightRotate(node);
  // RR Case
  if (balance < -1 && s.id > node->right->data.id)
    return leftRotate(node);
  // LR Case
  if (balance > 1 && s.id > node->left->data.id) {
    node->left = leftRotate(node->left);
    return rightRotate(node);
  }
  // RL Case
  if (balance < -1 && s.id < node->right->data.id) {
    node->right = rightRotate(node->right);
    return leftRotate(node);
  }
  return node;
}

// --- FILE SYSTEM (DATA PERSISTENCE) ---

void loadSongs() {
  std::ifstream file("songs.txt");
  if (!file.is_open())
    return;

  int id;
  std::string name, artist, genre;
  float rating;

  // Read format: ID Name|Artist|Genre|Rating
  while (file >> id) {
    file.ignore(100, ' '); // skip following space
    std::getline(file, name, '|');
    std::getline(file, artist, '|');
    std::getline(file, genre, '|');
    file >> rating;
    file.ignore(100, '\n'); // move to next line logic

    Song s = {id, name, artist, genre, rating};
    root = insertNode(root, s);
    allSongs.push_back(s);
  }
  file.close();
}

void saveSong(const Song &s) {
  std::ofstream file("songs.txt", std::ios::app);
  if (!file.is_open())
    return;
  file << s.id << " " << s.name << "|" << s.artist << "|" << s.genre << "|"
       << s.rating << "\n";
  file.close();
}

// --- RECOMMENDATION ENGINE (polymorphism / inheritance) ---

class RecommendationBase {
public:
  virtual ~RecommendationBase() {}
  virtual void run() = 0;
};

class GenreRecommendation : public RecommendationBase {
  std::string targetGenre;

public:
  GenreRecommendation(std::string g) : targetGenre(g) {}
  void run() override {
    std::vector<Song> results;
    std::string lowerTarget = targetGenre;
    std::transform(lowerTarget.begin(), lowerTarget.end(), lowerTarget.begin(),
                   ::tolower);

    for (const auto &song : allSongs) {
      std::string tempGenre = song.genre;
      std::transform(tempGenre.begin(), tempGenre.end(), tempGenre.begin(),
                     ::tolower);
      if (tempGenre == lowerTarget)
        results.push_back(song);
    }

    std::cout << "[";
    for (size_t i = 0; i < results.size(); ++i) {
      std::cout << results[i].toJson() << (i < results.size() - 1 ? "," : "");
    }
    std::cout << "]\n";
  }
};

class SimilarRecommendation : public RecommendationBase {
  int targetId;

public:
  SimilarRecommendation(int id) : targetId(id) {}
  void run() override {
    Song target;
    bool found = false;
    for (const auto &song : allSongs) {
      if (song.id == targetId) {
        target = song;
        found = true;
        break;
      }
    }
    if (!found) {
      std::cout << "[]\n";
      return;
    }

    std::vector<std::pair<float, Song>> rank;
    for (const auto &s : allSongs) {
      if (s.id == target.id)
        continue;
      // Calculate similarity score (lower is more similar)
      float score = std::abs(target.rating - s.rating);
      if (s.genre == target.genre)
        score -= 0.5f; // bonus for same genre
      rank.push_back({score, s});
    }

    std::sort(rank.begin(), rank.end(),
              [](const auto &a, const auto &b) { return a.first < b.first; });

    std::cout << "[";
    size_t count = std::min((size_t)5, rank.size());
    for (size_t i = 0; i < count; ++i) {
      std::cout << rank[i].second.toJson() << (i < count - 1 ? "," : "");
    }
    std::cout << "]\n";
  }
};

// --- SEARCH ENGINE (Function Overloading) ---

// Search by ID (AVL Tree search - O(log N))
void search(Node *node, int id) {
  if (!node) {
    std::cout << "[]\n";
    return;
  }
  if (node->data.id == id) {
    std::cout << "[" << node->data.toJson() << "]\n";
  } else if (id < node->data.id) {
    search(node->left, id);
  } else {
    search(node->right, id);
  }
}

// Search by Name (Substring search - O(N))
void search(std::string name) {
  std::vector<Song> results;
  std::string lowerQuery = name;
  std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(),
                 ::tolower);

  for (const auto &s : allSongs) {
    std::string lowerName = s.name;
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(),
                   ::tolower);
    if (lowerName.find(lowerQuery) != std::string::npos) {
      results.push_back(s);
    }
  }

  std::cout << "[";
  for (size_t i = 0; i < results.size(); ++i) {
    std::cout << results[i].toJson() << (i < results.size() - 1 ? "," : "");
  }
  std::cout << "]\n";
}

int main(int argc, char *argv[]) {
  if (argc < 2) {
    std::cout << "[]\n";
    return 0;
  }

  loadSongs();
  std::string cmd = argv[1];

  if (cmd == "get_all") {
    std::cout << "[";
    for (size_t i = 0; i < allSongs.size(); ++i) {
      std::cout << allSongs[i].toJson() << (i < allSongs.size() - 1 ? "," : "");
    }
    std::cout << "]\n";
  } else if (cmd == "add" && argc >= 6) {
    Song s;
    s.id = allSongs.empty() ? 1 : (allSongs.back().id + 1);
    s.name = argv[2];
    s.artist = argv[3];
    s.genre = argv[4];
    s.rating = std::stof(argv[5]);
    saveSong(s);
    std::cout << "{\"status\":\"success\", \"song\":" << s.toJson() << "}\n";
  } else if (cmd == "search_id" && argc >= 3) {
    search(root, std::stoi(argv[2]));
  } else if (cmd == "search_name" && argc >= 3) {
    search(argv[2]);
  } else if (cmd == "recommend_genre" && argc >= 3) {
    RecommendationBase *rb = new GenreRecommendation(argv[2]);
    rb->run();
    delete rb;
  } else if (cmd == "recommend_similar" && argc >= 3) {
    RecommendationBase *rb = new SimilarRecommendation(std::stoi(argv[2]));
    rb->run();
    delete rb;
  } else if (cmd == "top_rated") {
    std::vector<Song> sorted = allSongs;
    std::sort(sorted.begin(), sorted.end(),
              [](const auto &a, const auto &b) { return a.rating > b.rating; });
    std::cout << "[";
    size_t count = std::min((size_t)10, sorted.size());
    for (size_t i = 0; i < count; ++i) {
      std::cout << sorted[i].toJson() << (i < count - 1 ? "," : "");
    }
    std::cout << "]\n";
  } else {
    std::cout << "[]\n";
  }

  return 0;
}

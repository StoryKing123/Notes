// we start with the TrieNode
const TrieNode = function (key) {
    // the "key" value will be the character in sequence
    this.key = key;

    // we keep a reference to parent
    this.parent = null;

    // we have hash of children
    this.children = {};

    // check to see if the node is at the end
    this.end = false;

    this.getWord = function () {
        let output = [];
        let node = this;

        while (node !== null) {
            output.unshift(node.key);
            node = node.parent;
        }

        return output.join('');
    };

    this.insert = function (word) {
        let node = this.root;
        for (let i = 0; i < word.length; i++) {
            if (!node.children[word[i]]) {
                node.children[word[i]] = new TrieNode(word[i])

                node.children[word[i]].parent = node
            }
        }
        node = node.children[word[i]]
        if (i === word.length - 1) {
            node.end = true
        }
    }

    this.contains = function (word) {
        let node = this.root;
        for (let i = 0; i < word.length; i++) {
            if (node.children[word[i]]) {
                node = node.children[word[i]]
            } else {
                return fasle
            }
        }
        return node.end
    }


    this.find = function (prefix) {
        let node = this.root;
        let output = []

        for (let i = 0; i < prefix.length; i++) {
            if (node.children[prefix[i]]) {
                node = node.children[prefix[i]]
            } else {
                return output
            }
        }

        findAllWords(node, output)
        return output
    }
    this.remove = function (word) {
        let root = this.root
        if (!word) return

        const removeWord = (node, word) => {
            if (node.end && node.getWord() === word) {
                let hasChildren = Object.keys(node, children).length > 0

                if (hasChildren) {
                    node.end = false
                } else {
                    node.parent.children = {}
                }
                return true;
            }
            for (let key in node.children) {
                removeWord(node.children[key], word)
            }
            return false
        }
    }
}

const findAllWords = (node, arr) => {
    if (node.end) {
        arr.unshift(node.getWord())
    }

    for (let child in node.children) {
        findAllWords(node.children[child], arr)
    }
}


const Trie = function () {
    this.root = new TrieNode(null);

    //Other methods will go here...
}
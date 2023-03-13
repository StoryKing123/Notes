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
}

const Trie = function () {
    this.root = new TrieNode(null);

    //Other methods will go here...
}
#ifndef BST_H
#define BST_H

#include "patient.h"

typedef struct BSTNode {
    Patient data;
    struct BSTNode *left;
    struct BSTNode *right;
} BSTNode;

BSTNode *bst_insert(BSTNode *root, Patient p);
BSTNode *bst_search(BSTNode *root, int patient_id);
BSTNode *bst_delete(BSTNode *root, int patient_id);
void bst_inorder(const BSTNode *root);
void bst_free(BSTNode *root);

#endif /* BST_H */

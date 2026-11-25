#include "bst.h"
#include <stdio.h>
#include <stdlib.h>

static BSTNode *find_min(BSTNode *node) {
    while (node && node->left) node = node->left;
    return node;
}

BSTNode *bst_insert(BSTNode *root, Patient p) {
    if (!root) {
        BSTNode *node = (BSTNode *)malloc(sizeof(BSTNode));
        if (!node) return NULL;
        node->data = p;
        node->left = NULL;
        node->right = NULL;
        return node;
    }
    if (p.id < root->data.id) {
        root->left = bst_insert(root->left, p);
    } else if (p.id > root->data.id) {
        root->right = bst_insert(root->right, p);
    } else {
        root->data = p; /* Update existing */
    }
    return root;
}

BSTNode *bst_search(BSTNode *root, int patient_id) {
    if (!root || root->data.id == patient_id) return root;
    if (patient_id < root->data.id) return bst_search(root->left, patient_id);
    return bst_search(root->right, patient_id);
}

BSTNode *bst_delete(BSTNode *root, int patient_id) {
    if (!root) return NULL;
    if (patient_id < root->data.id) {
        root->left = bst_delete(root->left, patient_id);
    } else if (patient_id > root->data.id) {
        root->right = bst_delete(root->right, patient_id);
    } else {
        if (!root->left) {
            BSTNode *right = root->right;
            free(root);
            return right;
        } else if (!root->right) {
            BSTNode *left = root->left;
            free(root);
            return left;
        }
        BSTNode *succ = find_min(root->right);
        root->data = succ->data;
        root->right = bst_delete(root->right, succ->data.id);
    }
    return root;
}

void bst_inorder(const BSTNode *root) {
    if (!root) return;
    bst_inorder(root->left);
    print_patient(&root->data);
    bst_inorder(root->right);
}

void bst_free(BSTNode *root) {
    if (!root) return;
    bst_free(root->left);
    bst_free(root->right);
    free(root);
}

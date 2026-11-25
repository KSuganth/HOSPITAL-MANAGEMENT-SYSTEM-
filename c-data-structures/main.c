#include <stdio.h>
#include "patient.h"
#include "doctor.h"
#include "appointment.h"
#include "linked_list.h"
#include "queue.h"
#include "stack.h"
#include "bst.h"
#include "hash_table.h"
#include "algorithms.h"

int main(void) {
    printf("==========================================================\n");
    printf("  MediCare HMS - C Data Structures Demonstration Module\n");
    printf("==========================================================\n\n");

    /* Sample Patients */
    Patient p1 = create_patient(103, "Rohan Sharma", 34, "Male", "B+", "+91-9876543210");
    Patient p2 = create_patient(101, "Ananya Iyer", 28, "Female", "O+", "+91-9822334455");
    Patient p3 = create_patient(104, "Vikram Patel", 45, "Male", "A+", "+91-9811223344");
    Patient p4 = create_patient(102, "Meera Nair", 52, "Female", "AB-", "+91-9844556677");

    /* Sample Doctor */
    Doctor d1 = create_doctor(201, "Arjun Mehta", "Cardiology", 800.00, 1);
    print_doctor(&d1);
    printf("\n");

    /* 1. Linked List Demonstration */
    PatientList list;
    list_init(&list);
    list_insert(&list, p1);
    list_insert(&list, p2);
    list_insert(&list, p3);
    list_insert(&list, p4);
    list_traverse(&list);

    printf("\nDeleting Patient 104 from Linked List...\n");
    list_delete_by_id(&list, 104);
    list_traverse(&list);
    printf("\n");

    /* 2. Queue Demonstration (Appointment Scheduling) */
    AppointmentQueue appt_q;
    queue_init(&appt_q);
    queue_enqueue(&appt_q, create_appointment(1, 101, 201, "2026-11-26", "10:00", "Scheduled"));
    queue_enqueue(&appt_q, create_appointment(2, 103, 201, "2026-11-26", "10:30", "Scheduled"));
    queue_enqueue(&appt_q, create_appointment(3, 102, 201, "2026-11-25", "09:00", "Confirmed"));
    queue_display(&appt_q);

    Appointment served;
    if (queue_dequeue(&appt_q, &served)) {
        printf("Dequeued next appointment for consultation:\n");
        print_appointment(&served);
    }
    printf("\n");

    /* 3. Stack Demonstration (Undo Operations) */
    UndoStack undo_stack;
    stack_init(&undo_stack);
    stack_push(&undo_stack, "ADD_PATIENT", 103);
    stack_push(&undo_stack, "BOOK_APPOINTMENT", 2);
    UndoAction last_action;
    if (stack_pop(&undo_stack, &last_action)) {
        printf("Undo popped: %s (Record ID: %d)\n\n", last_action.action_type, last_action.record_id);
    }

    /* 4. Binary Search Tree Demonstration */
    BSTNode *bst_root = NULL;
    bst_root = bst_insert(bst_root, p1);
    bst_root = bst_insert(bst_root, p2);
    bst_root = bst_insert(bst_root, p3);
    bst_root = bst_insert(bst_root, p4);

    printf("--- BST Inorder Traversal (Sorted by Patient ID) ---\n");
    bst_inorder(bst_root);
    BSTNode *found_bst = bst_search(bst_root, 102);
    printf("BST Search for ID 102: %s\n\n", found_bst ? found_bst->data.name : "Not Found");

    /* 5. Hash Table Demonstration (O(1) Patient ID Lookup) */
    PatientHashTable ht;
    ht_init(&ht);
    ht_insert(&ht, p1);
    ht_insert(&ht, p2);
    ht_insert(&ht, p3);
    ht_insert(&ht, p4);
    Patient *ht_res = ht_lookup(&ht, 103);
    printf("Hash Table Lookup for ID 103: %s\n\n", ht_res ? ht_res->name : "Not Found");

    /* 6. Sorting & Searching Algorithms */
    Patient arr[4] = {p1, p2, p3, p4};
    sort_patients_by_name(arr, 4);
    printf("--- Patients Sorted Alphabetically (Merge Sort) ---\n");
    for (int i = 0; i < 4; i++) print_patient(&arr[i]);

    int lin_idx = linear_search_patient_by_name(arr, 4, "Meera Nair");
    printf("Linear Search for 'Meera Nair': index %d\n", lin_idx);

    sort_patients_by_id(arr, 4);
    int bin_idx = binary_search_patient_by_id(arr, 4, 104);
    printf("Binary Search for ID 104: index %d\n\n", bin_idx);

    Appointment appts[3] = {
        create_appointment(1, 101, 201, "2026-11-28", "11:00", "Scheduled"),
        create_appointment(2, 103, 201, "2026-11-25", "09:30", "Confirmed"),
        create_appointment(3, 102, 201, "2026-11-26", "14:00", "Scheduled"),
    };
    sort_appointments_by_date(appts, 3);
    printf("--- Appointments Sorted by Date ---\n");
    for (int i = 0; i < 3; i++) print_appointment(&appts[i]);

    /* Cleanup all dynamically allocated memory */
    list_free(&list);
    queue_free(&appt_q);
    stack_free(&undo_stack);
    bst_free(bst_root);
    ht_free(&ht);

    printf("\nAll memory freed cleanly. Module test complete.\n");
    return 0;
}

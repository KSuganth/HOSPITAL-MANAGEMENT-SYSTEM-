#include "doctor.h"
#include <stdio.h>

Doctor create_doctor(int id, const char *name, const char *specialization,
                     double consultation_fee, int is_available) {
    Doctor d;
    d.id = id;
    d.consultation_fee = consultation_fee;
    d.is_available = is_available;
    snprintf(d.name, MAX_DOC_NAME, "%s", name ? name : "");
    snprintf(d.specialization, MAX_SPEC_LEN, "%s", specialization ? specialization : "");
    return d;
}

void print_doctor(const Doctor *d) {
    if (!d) return;
    printf("[DOC-%04d] Dr. %-18s | %-15s | Fee: Rs. %.2f | %s\n",
           d->id, d->name, d->specialization, d->consultation_fee,
           d->is_available ? "Available" : "Unavailable");
}

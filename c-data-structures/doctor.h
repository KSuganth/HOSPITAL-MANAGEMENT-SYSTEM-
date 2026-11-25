#ifndef DOCTOR_H
#define DOCTOR_H

#define MAX_DOC_NAME 100
#define MAX_SPEC_LEN 64

typedef struct {
    int id;
    char name[MAX_DOC_NAME];
    char specialization[MAX_SPEC_LEN];
    double consultation_fee;
    int is_available;
} Doctor;

Doctor create_doctor(int id, const char *name, const char *specialization,
                     double consultation_fee, int is_available);
void print_doctor(const Doctor *d);

#endif /* DOCTOR_H */

#ifndef PATIENT_H
#define PATIENT_H

#define MAX_NAME_LEN 100
#define MAX_PHONE_LEN 20
#define MAX_BLOOD_LEN 8

typedef struct {
    int id;
    char name[MAX_NAME_LEN];
    int age;
    char gender[16];
    char blood_group[MAX_BLOOD_LEN];
    char phone[MAX_PHONE_LEN];
} Patient;

Patient create_patient(int id, const char *name, int age, const char *gender,
                       const char *blood_group, const char *phone);
void print_patient(const Patient *p);

#endif /* PATIENT_H */

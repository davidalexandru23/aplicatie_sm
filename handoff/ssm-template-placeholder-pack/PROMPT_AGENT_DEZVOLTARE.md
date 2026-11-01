# Prompt pentru agentul de dezvoltare

Lucrezi în repository-ul aplicației SSM. Integrează cele 25 de fișiere din folderul `templates/` în catalogul și generatorul existent. Citește mai întâi `README.md` și `INVENTAR_PLACEHOLDERE.md`; inventarul comprimă seriile numerice, iar token-urile exacte se citesc din șabloane.

## Cerințe

1. Folosește pachetul ca sursă pentru șabloanele normalizate; păstrează fișierele brute din `sabloane_ssm` neschimbate. Menține formatul fiecărui document și aspectul paginilor.
2. Pentru DOCX, completează token-urile `{PLACEHOLDER_*}` după numele exact. Pentru PDF, completează câmpurile AcroForm după numele `PLACEHOLDER_*`, nu prin coordonate fixe. Pentru XLSX, înlocuiește token-urile din toate foile și celulele; tratează sufixele `_001`, `_002` ca rânduri repetate de cursanți.
3. Respectă poziția din șablon: înlocuiește câmpurile variabile etichetate și datele-exemplu. Nu introduce date în textul static al titlului și nu crea subtitluri/antete noi. Numele semnatarului se completează în câmpul de nume sau în spațiul de nume de sub rolul explicit din blocul existent de aprobare/semnare. Lasă necompletată zona destinată semnăturii olografe.
4. Mapează doar datele existente și verificate din firmă, salariat, actul de identitate, domiciliu, post, punct de lucru, sesiunea de igienă și cursant. Nu inventa valori implicite pentru câmpurile lipsă. Păstrează token-ul vizibil și marchează documentul `missing_data` până la completare/revizie.
5. La adeverința de igienă, cere sesiunea și cursantul. La anexele de curs, folosește lista participanților și calculează totalurile din prezențe/rezultate înregistrate. Nu păstra datele-exemplu, CNP-uri, nume, antete, logo-uri sau ștampile ale firmelor din modelele brute.
6. În documentele de evaluare și prevenire a riscurilor, lasă evaluatorului uman datele profesionale care nu există în baza de date. Nu genera scoruri, concluzii, măsuri sau aprobări ca și cum ar fi evaluate. Menține avertismentul că exemplele trebuie validate.
7. Actualizează catalogul, validarea și interfața astfel încât toate cele 25 de formate să poată fi alese, iar câmpurile specifice de sesiune, cursant, angajat și post să apară doar unde se aplică. Permite completarea manuală a câmpurilor prestatorului și a altor date lipsă.
8. Păstrează aplicația monolitică, cu interfață simplă și cost redus de resurse. Produsul nu include conturi/login pentru angajați, self-instruire, semnare electronică online sau roluri de utilizator. Păstrează istoricul sesiunilor și instruirilor în baza de date.
9. Importul clientului folosește un singur sheet cu câmpuri prestabilite pentru firmă și angajați. Nu adăuga cod poștal la datele angajatului.
10. Nu testa prin generarea de documente în interfața live și nu modifica înregistrările din baza de date. Verifică offline consistența catalogului și a numelor fișierelor, iar la final raportează fișierele integrate, mapările noi și câmpurile care rămân manuale.

## Livrabil

Integrează pachetul în repository, actualizează mapping-urile de câmpuri și comportamentul pentru valori lipsă, apoi lasă o listă concisă cu ce ai schimbat și ce rămâne de completat de către operator/evaluator.

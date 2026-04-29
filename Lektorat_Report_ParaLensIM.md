# Lektorat Report: ParaLensIM (Inkl. Erweiterter Tiefenprüfung)

Dieses Dokument enthält die schrittweise durchgeführte Lektoratsanalyse der einzelnen LaTeX-Dateien im Read-Only-Modus. Im Rahmen eines zweiten Durchlaufs wurde insbesondere für die umfangreichen Kapitel `technologies.tex` und `implementation.tex` eine detaillierte Tiefenprüfung vorgenommen.

---

## Datei: `sections/abstract.tex`

### 1. Sprachliche Verbesserungen (Akademischer Stil)

**Englischer Abstract:**
*   **Original:** `Operators are required to manually copy settings and actual values from machine Human-Machine Interfaces (HMIs).`
*   **Problem:** Die Begriffe "Operators" und "copy" sind etwas umgangssprachlich für einen akademischen Text.
*   **Vorschlag:** `Operating personnel are required to manually transfer settings and actual values from the machines' Human-Machine Interfaces (HMIs).`

**Deutsche Zusammenfassung:**
*   **Original:** `Mitarbeiter müssen Einstell- und Istwerte händisch von den Human-Machine-Interfaces (HMIs) der Maschinen abschreiben.`
*   **Problem:** "händisch abschreiben" und "Mitarbeiter" sind zu umgangssprachlich.
*   **Vorschlag:** `Das Bedienpersonal muss Einstell- und Istwerte manuell von den Human-Machine-Interfaces (HMIs) der Maschinen übertragen.`
*   **Original:** `Erschwerter wird dies durch Sprachbarrieren...`
*   **Problem:** Tippfehler / grammatikalischer Fehler ("Erschwerter").
*   **Vorschlag:** `Erschwert wird dieser Vorgang durch Sprachbarrieren...`
*   **Original:** `Die Diplomarbeit \textit{ParaLens IM} stellt eine mobile Anwendung vor, die diesen Arbeitsablauf digitalisiert und automatisiert.`
*   **Problem:** Eine Diplomarbeit "stellt nicht vor" (Personifizierung). Besser passiv oder "Im Rahmen von...".
*   **Vorschlag:** `Im Rahmen der vorliegenden Diplomarbeit \textit{ParaLens IM} wird eine mobile Applikation präsentiert, die diesen Arbeitsablauf digitalisiert und automatisiert.`
*   **Original:** `...identifiziert die App spezifische HMI-Bildschirme...`
*   **Problem:** "App" ist ein umgangssprachlicher Begriff.
*   **Vorschlag:** `...identifiziert die Applikation spezifische HMI-Bildschirme...`

### 2. Fehlende Zitate & Belege (\cite{TODO})
*In einem Abstract oder einer Zusammenfassung werden für gewöhnlich keine Quellenangaben gemacht. Daher gibt es in dieser Datei keine fehlenden Zitate.*

### 3. Glossar-Extraktion
Folgende Begriffe und Abkürzungen sollten in das Glossar (`glossary.tex`) aufgenommen werden:

*   **HMI (Human-Machine Interface):** Mensch-Maschine-Schnittstelle, über die das Bedienpersonal mit der Maschine interagiert.
*   **OCR (Optical Character Recognition / Optische Zeichenerkennung):** Technologie zur automatisierten Erkennung von Text in Bildern.
*   **CC200:** Spezifische Steuerungsgeneration für Spritzgussmaschinen (vermutlich von Engel).
*   **AR-Overlay (Augmented Reality Overlay):** Visuelle Überlagerung der realen Umgebung (Kamerabild) mit digitalen Zusatzinformationen in Echtzeit.
*   **Spritzguss (Injection Molding):** Ein Urformverfahren in der Kunststoffverarbeitung.

---

## Datei: `sections/introduction.tex`

### 1. Sprachliche Verbesserungen (Akademischer Stil)

*   **Original:** `In diesem Spannungsfeld bewegt sich das Projekt ParaLensIM.`
*   **Vorschlag:** `In diesem Kontext verortet sich das Projekt ParaLensIM.` oder `Diese Problematik adressiert das Projekt ParaLensIM.`
*   **Original:** `Ziel ist es, eine Brücke zwischen der visuellen Anzeige der Bestandsmaschinen und der digitalen Weiterverarbeitung zu schlagen, ohne in die bestehende Steuerungshierarchie eingreifen zu müssen.`
*   **Vorschlag:** `Ziel ist es, eine informationstechnische Verknüpfung zwischen der visuellen Anzeige der Bestandsmaschinen und der digitalen Weiterverarbeitung herzustellen, ohne in die bestehende Steuerungshierarchie einzugreifen.`
*   **Original:** `Die bisherige Praxis birgt jedoch erhebliche Nachteile: Techniker müssen Werte manuell ablesen und händisch in Formulare oder Excel-Tabellen übertragen.`
*   **Vorschlag:** `Die bisherige Praxis weist jedoch erhebliche Nachteile auf: Das technische Personal muss Werte manuell ablesen und in Formulare oder Tabellenkalkulationen übertragen.`
*   **Original:** `Die Idee hinter ParaLensIM ist es, diesen Prozess durch eine mobile Anwendung zu transformieren, die Maschinendaten per Kamera erfasst, validiert und digitalisiert.`
*   **Vorschlag:** `Der Lösungsansatz von ParaLensIM besteht darin, diesen Prozess durch eine mobile Applikation zu transformieren, welche Maschinendaten kamerabasiert erfasst, validiert und digitalisiert.`

### 2. Fehlende Zitate & Belege (\cite{TODO})

*   **Behauptung (Industrie 4.0 Ziele):** `Die fortschreitende Digitalisierung im industriellen Sektor... zielt darauf ab, Produktionsprozesse transparenter, effizienter und datengetriebener zu gestalten \cite{TODO}.`
*   **Behauptung (OPC UA Standardisierung):** `... über standardisierte Schnittstellen wie OPC UA austauschen \cite{TODO}, ...`

### 3. Glossar-Extraktion
*   **Industrie 4.0**, **Brownfield**, **OPC UA**, **React Native**, **Expo**, **.NET Core**.

---

## Datei: `sections/technologies.tex`

### 1. Sprachliche Verbesserungen (Akademischer Stil)

*   **Original:** `Die App ParaLens ist als mobile Anwendung konzipiert...`
*   **Vorschlag:** `Die Applikation ParaLens ist als mobile Anwendung konzipiert...`
*   **Original:** `...weil diese Geräte in der Praxis leicht verfügbar sind, eine gute Kamera besitzen und sich unkompliziert im Arbeitsalltag einsetzen lassen.`
*   **Vorschlag:** `...da diese Geräte weit verbreitet sind, über hochauflösende Kamerasysteme verfügen und sich effizient in den Arbeitsalltag integrieren lassen.`
*   **Original:** `...der Entwicklungsfokus lag aber auf Android, da dort die Tests im Team am häufigsten stattgefunden haben.`
*   **Vorschlag:** `...der Entwicklungsfokus lag jedoch auf Android, da die primäre Testumgebung auf dieser Plattform basierte.`
*   **Original:** `Die App muss mit wechselnden Lichtverhältnissen und Netzwerksituationen zurechtkommen...`
*   **Vorschlag:** `Die Applikation muss gegenüber wechselnden Lichtverhältnissen und Netzwerksituationen robust sein...`
*   **Original:** `Das ist besonders für Dark Mode wichtig, weil die Komponenten dann nicht doppelt gestylt werden müssen, sondern automatisch anhand des aktiven Themes reagieren.`
*   **Vorschlag:** `Dies ist insbesondere für den Dark Mode von Bedeutung, da die Komponenten somit keine redundanten Stildefinitionen benötigen, sondern sich automatisch an das aktive Theme anpassen.`
*   **Original:** `Man kann sich das Entity Framework wie eine Art Übersetzer vorstellen.`
*   **Vorschlag:** `Das Entity Framework fungiert als Abstraktionsschicht zwischen dem Programmcode und der relationalen Datenbank.`
*   **Original:** `Man kann sich ein Repository wie einen Vermittler vorstellen.`
*   **Vorschlag:** `Ein Repository dient als Vermittlungsschicht (Mediator) zwischen der Geschäftslogik und dem Datenzugriff.`
*   **Original:** `Man kann sich ein Model wie einen Bauplan vorstellen.`
*   **Vorschlag:** `Ein Model definiert die strukturelle Vorlage für die im Programm verarbeiteten Daten.`

### 2. Fehlende Zitate & Belege (\cite{TODO})
*   **Offline-First-Strategie:** `Die Nutzung von On-Device-Lösungen ermöglicht die vordefinierte Offline-First-Strategie und minimale Latenzzeiten \cite{TODO}, da...`

### 3. Glossar-Extraktion
*   **Cross-Platform**, **TypeScript**, **OpenCV**, **CLAHE**, **Sobel-Operator**, **Canny-Edge-Detektor**, **RANSAC**, **JSI**, **REST API**, **Entity Framework Core**.

---

## Datei: `sections/implementation.tex`

### 1. Erweiterte Tiefenprüfung: Sprachliche Verbesserungen (Akademischer Stil & "Tutorial-Stil")

Bei der wiederholten, tiefgehenden Analyse ist stark aufgefallen, dass vor allem im **Backend-Teil** der Schreibstil stark ins Informelle, Subjektive und in einen **Schritt-für-Schritt-Tutorial-Stil** abrutscht. Dies ist für eine wissenschaftliche Abschlussarbeit unangemessen.

*   **Problem "Tutorial-Stil":** Es wird detailliert beschrieben, welche Konsolenbefehle eingetippt wurden.
    *   **Original:** `Es wurde die PostgreSQL-Shell oder ein Tool wie pgAdmin geöffnet, um eine neue Datenbank zu erstellen. Der Befehl CREATE DATABASE paralensbe; wurde verwendet...`
    *   **Vorschlag:** Diese konkreten Befehle sollten im Fließtext gestrichen oder bestenfalls in den Anhang verbannt werden. Der akademische Fokus liegt auf der Architektur. *„Die Initialisierung der Datenbankstruktur sowie die Anlage der notwendigen Berechtigungskonzepte erfolgten unter PostgreSQL.“*
    *   **Original:** `Die Package Manager Console in Visual Studio wurde geöffnet und Install-Package Npgsql.EntityFrameworkCore.PostgreSQL ausgeführt.`
    *   **Vorschlag:** *„Die Integration der PostgreSQL-Anbindung erfolgte über das entsprechende NuGet-Paket für das Entity Framework Core.“*
    *   **Original:** `Für Migrationen wurde dotnet ef migrations add Initial ausgeführt... dotnet ef database update wurde verwendet...`
    *   **Vorschlag:** *„Die Überführung des Datenmodells in das relationale Datenbankschema wurde über den integrierten Migrationsmechanismus des Entity Frameworks realisiert.“*

*   **Umgangssprache & Subjektivität im Backend-Kapitel:**
    *   **Original:** `Das Backend ist ein wichtiger Teil von ParaLens, da es dafür sorgt, dass alle Scan-Daten automatisch gespeichert werden. Sobald eine Internetverbindung besteht, werden die Daten im Hintergrund hochgeladen, ohne dass man etwas machen muss.`
    *   **Vorschlag:** *„Das Backend verantwortet die zentrale Persistierung der Scan-Daten. Die Datenübertragung erfolgt im Hintergrundprozess (Background-Sync), sobald die Netzwerkkonnektivität wiederhergestellt ist, ohne dass eine explizite Benutzerinteraktion erforderlich ist.“*
    *   **Original:** `Ein großer Vorteil ist, dass keine Daten verloren gehen, auch wenn das Gerät zwischendurch offline ist.`
    *   **Vorschlag:** *„Dies gewährleistet eine hohe Datenintegrität und Ausfallsicherheit bei temporären Verbindungsabbrüchen im Offline-Betrieb.“*
    *   **Original:** `Zusätzlich können Backups erstellt werden, falls etwas schiefgeht.`
    *   **Vorschlag:** *„Zusätzlich ermöglicht die zentrale Datenhaltung eine automatisierte Backup-Strategie zur Prävention von Datenverlusten.“*
    *   **Original:** `Einspritzen „erbt“ keine Attribute direkt, aber alles unter Einspritzen ist damit verbunden.`
    *   **Vorschlag:** *„Die Entität ‚Einspritzen‘ nutzt keine klassische Vererbung, sondern ist über Fremdschlüsselrelationen (Foreign Keys) streng hierarchisch mit den untergeordneten Entitäten verknüpft.“*
    *   **Original:** `Es wurde sich für PostgreSQL entschieden, weil es robust, skalierbar und gut mit .NET harmoniert.`
    *   **Vorschlag:** *„Die Wahl fiel auf PostgreSQL aufgrund seiner Robustheit, Skalierbarkeit sowie der nahtlosen Integration in das .NET-Ökosystem.“*
    *   **Original:** `pgAdmin wurde als GUI installiert... Es zeigt Tabellen... was den Einstieg erleichtert.`
    *   **Vorschlag:** *Subjektive Passagen („was den Einstieg erleichtert“) sollten ersatzlos gestrichen werden.*
    *   **Original:** `Wenn eine Request hereinkommt, steuert ASP.NET die Route an den richtigen Controller.`
    *   **Vorschlag:** *„Eingehende HTTP-Anfragen werden durch das ASP.NET-Routing an den zuständigen Controller delegiert.“*

*   **Umgangssprache im Frontend-Kapitel (bereits zuvor identifiziert):**
    *   **Original:** `Das ist schnell, man kann es leicht lesen und es passt gut zu React Native.`
    *   **Vorschlag:** `Dieser Ansatz ermöglicht eine effiziente Entwicklung, bietet eine hohe Lesbarkeit und integriert sich nahtlos in React Native.`
    *   **Original:** `...damit die Datenbank nicht explodeiert.`
    *   **Vorschlag:** `...um eine übermäßige Belastung der Datenbank (Cartesian Explosion) zu vermeiden.`

### 2. Erweiterte Tiefenprüfung: Fehlende Zitate & Belege (\cite{TODO})

Neben den bereits identifizierten fehlenden Quellen (z.B. Kamera-Hardware-Steuerung) fallen bei der Tiefenprüfung im Backend-Kapitel weitere gravierende Lücken auf:

*   **PostgreSQL:** Bei der Einführung (`PostgreSQL ist eine leistungsstarke Open-Source-Datenbank...`) fehlt ein Verweis auf die offizielle Dokumentation oder Fachliteratur zu PostgreSQL.
*   **Entity Framework Core & ORM:** Die Beschreibung der Arbeitsweise des Entity Frameworks muss wissenschaftlich belegt werden.
*   **Architektur-Patterns:** Sowohl das **Repository Pattern** als auch das **Unit of Work Pattern** werden sehr ausführlich beschrieben. Hier ist ein Zitat zwingend erforderlich (z.B. Verweis auf Martin Fowler: "Patterns of Enterprise Application Architecture").
*   **REST-API Design:** Die Beschreibung der RESTful-Endpunkte, HTTP-Statuscodes und Controller sollte mit Fachliteratur zum Thema API-Design belegt werden.

### 3. Erweiterte Glossar-Extraktion
Folgende Begriffe aus dem Backend-Kapitel sollten zwingend ins Glossar aufgenommen werden:

*   **DTO (Data Transfer Object):** Ein Entwurfsmuster, das ein Objekt beschreibt, welches ausschließlich dem Datentransport zwischen Prozessen dient.
*   **CORS (Cross-Origin Resource Sharing):** Ein Mechanismus, der es Webbrowsern ermöglicht, Cross-Origin-Anfragen an APIs sicher durchzuführen.
*   **Cartesian Explosion:** Ein Performance-Problem in relationalen Datenbankabfragen, bei dem durch ungünstige JOIN-Operationen (z.B. beim Laden vieler 1:N-Beziehungen) eine exponentielle Menge an redundanten Datensätzen in den Speicher geladen wird.
*   **N+1-Problem:** Ein Anti-Pattern beim Datenbankzugriff durch ORM-Frameworks, bei dem für $N$ referenzierte Objekte jeweils eine eigene Datenbankabfrage ($+1$) ausgelöst wird, anstatt diese effizient zu bündeln.
*   **Unit of Work (Pattern):** Ein Entwurfsmuster, das eine logische Transaktion (Menge von Operationen) verwaltet und sicherstellt, dass Änderungen konsistent in die Datenbank geschrieben werden.
*   **Repository Pattern:** Ein Entwurfsmuster, das die Datenzugriffsschicht (Data Access Layer) von der Geschäftslogik trennt.

---

## Datei: `sections/summary.tex`, `sections/appendix.tex`, `sections/related_work.tex`

*(Wie im ersten Durchlauf analysiert: Reduktion von Begriffen wie "Vibe-Coding", "händisch" und Einfügen von Belegen bei Kommerziellen Maschinenanbindungen).*

---

## Phase 5: Abschluss und globale Konsistenzprüfung

### Globale Inkonsistenzen und Auffälligkeiten
1. **"App" vs. "Applikation" vs. "Anwendung":** Vereinheitlichung zu "mobile Applikation" empfohlen.
2. **"Full Scan" vs. "Fullscan" vs. "FullScan":** Einheitliche Schreibweise (z.B. "Full Scan" für Text, `FullScan` für Code) empfohlen.
3. **Tutorial-Stil im Backend vs. Analytischer Stil im Computer-Vision-Teil:** Die Arbeit weist einen starken stilistischen Bruch auf. Während Kapitel wie "Display-Erkennungsalgorithmus" (Computer Vision, OpenCV, Mathematik) ein hohes akademisches Niveau aufweisen, rutscht das Backend-Kapitel extrem in eine "Schritt-für-Schritt"-Anleitung (mit Konsolenbefehlen) ab. **Dringende Empfehlung:** Das Backend-Kapitel muss im Abstraktionsgrad angehoben werden (Fokus auf "Warum wurde etwas wie architektonisch gelöst?" anstatt "Welche Befehle wurden in die Konsole getippt?").

### Fazit zum Lektorat
Inhaltlich ist die Arbeit hervorragend und technologisch sehr anspruchsvoll. Der tiefgehende, zweite Blick auf das Implementierungskapitel bestätigt jedoch, dass insbesondere im Bereich "Backend" der Schreibstil vom wissenschaftlichen Standard abweicht (Umgangssprache, Tutorial-Stil, fehlende Literaturbelege für Architektur-Patterns). Werden diese Bereiche anhand der Vorschläge im Report überarbeitet (Abstraktion der Konsolenbefehle, Verwendung präziser Fachtermini statt bildhafter Metaphern), steht einer exzellenten Diplomarbeit nichts mehr im Wege.

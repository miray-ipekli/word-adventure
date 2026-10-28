// Each topic becomes an island on the map. Every level has its own word set.
// Word entries are [english, turkish, example sentence]. The example must contain
// the English word exactly, because the "fill the gap" question blanks it out.

export const LEVELS = [
  { id: 'beginner', name: 'Beginner', hint: 'cat, happy, ticket', blurb: 'First words and short sentences.' },
  { id: 'intermediate', name: 'Intermediate', hint: 'deadline, nervous, luggage', blurb: 'Everyday conversations, work and travel.' },
  { id: 'advanced', name: 'Advanced', hint: 'itinerary, overwhelmed, streamline', blurb: 'Idioms and precise, natural vocabulary.' },
]

export const TOPICS = [
  {
    id: 'daily', name: 'Daily Life & Home', icon: '🏠', color: '#FF9F68',
    words: {
      beginner: [
        ['house', 'ev', 'We live in a small house.'],
        ['kitchen', 'mutfak', 'Mom is cooking in the kitchen.'],
        ['bed', 'yatak', 'I go to bed at ten.'],
        ['window', 'pencere', 'Please open the window.'],
        ['clean', 'temizlemek', 'I clean my room on Sunday.'],
        ['breakfast', 'kahvaltı', 'I eat eggs for breakfast.'],
      ],
      intermediate: [
        ['neighbor', 'komşu', 'Our neighbor has a friendly dog.'],
        ['chores', 'ev işleri', 'We share the chores at home.'],
        ['laundry', 'çamaşır', 'I do the laundry every weekend.'],
        ['rent', 'kira', 'The rent is due on Monday.'],
        ['commute', 'işe gidip gelme yolculuğu', 'My commute takes forty minutes.'],
        ['routine', 'rutin', 'Exercise is part of my morning routine.'],
      ],
      advanced: [
        ['household', 'hane, ev halkı', 'Every household needs a first-aid kit.'],
        ['tidy up', 'toparlamak', "Let's tidy up before the guests arrive."],
        ['run out of', 'tükenmek, bitmek', 'We always run out of milk on Fridays.'],
        ['errand', 'ayak işi', 'I have one more errand to run.'],
        ['cozy', 'sıcacık, rahat', 'The living room feels cozy in winter.'],
        ['procrastinate', 'ertelemek', 'I procrastinate when a task is boring.'],
      ],
    },
  },
  {
    id: 'food', name: 'Food & Café', icon: '☕', color: '#E8A15C',
    words: {
      beginner: [
        ['apple', 'elma', 'I eat an apple every day.'],
        ['water', 'su', 'Can I have some water, please?'],
        ['bread', 'ekmek', 'The bread is still warm.'],
        ['cheese', 'peynir', 'Turkish breakfast has a lot of cheese.'],
        ['hungry', 'aç', 'I am hungry after school.'],
        ['cup', 'fincan', 'She drinks a cup of tea.'],
      ],
      intermediate: [
        ['menu', 'menü', 'Could we see the menu, please?'],
        ['order', 'sipariş vermek', "I'd like to order a latte."],
        ['bill', 'hesap (restoranda)', 'Can we have the bill, please?'],
        ['spicy', 'acı, baharatlı', 'This soup is too spicy for me.'],
        ['recipe', 'tarif', 'My grandmother gave me her recipe.'],
        ['takeaway', 'paket servis', "Let's get a takeaway tonight."],
      ],
      advanced: [
        ['appetizer', 'başlangıç, meze', 'We shared a cold appetizer.'],
        ['savory', 'tuzlu (tatlı olmayan)', 'I prefer savory snacks to sweets.'],
        ['leftovers', 'artan yemekler', 'We had leftovers for lunch.'],
        ['dietary restriction', 'beslenme kısıtlaması', 'Do you have a dietary restriction?'],
        ['bland', 'yavan, tatsız', 'The pasta was a bit bland.'],
        ['craving', 'canı çekme', 'I have a craving for chocolate.'],
      ],
    },
  },
  {
    id: 'travel', name: 'Travel', icon: '🧳', color: '#4FA3F7',
    words: {
      beginner: [
        ['ticket', 'bilet', 'I have a ticket for the train.'],
        ['map', 'harita', "Let's look at the map."],
        ['hotel', 'otel', 'Our hotel is near the sea.'],
        ['bag', 'çanta', 'My bag is very heavy.'],
        ['beach', 'plaj', 'We swim at the beach.'],
        ['passport', 'pasaport', "Don't forget your passport."],
      ],
      intermediate: [
        ['luggage', 'bagaj, valiz', 'My luggage is too heavy.'],
        ['reservation', 'rezervasyon', 'I have a reservation for two nights.'],
        ['sightseeing', 'gezip görme', 'We went sightseeing in Rome.'],
        ['destination', 'varış noktası', 'Antalya is a popular destination.'],
        ['delay', 'gecikme', 'There is a two-hour delay.'],
        ['souvenir', 'hediyelik eşya', 'I bought a souvenir for my niece.'],
      ],
      advanced: [
        ['itinerary', 'seyahat planı', 'Our itinerary includes three cities.'],
        ['layover', 'aktarma molası', 'We have a long layover in Doha.'],
        ['off the beaten path', 'bilinen yolların dışında', 'I love places off the beaten path.'],
        ['jet lag', 'saat farkı yorgunluğu', 'I had terrible jet lag after the flight.'],
        ['accommodation', 'konaklama', 'The price includes accommodation.'],
        ['wanderlust', 'gezme tutkusu', 'Her wanderlust takes her everywhere.'],
      ],
    },
  },
  {
    id: 'airport', name: 'Airport Work', icon: '🛫', color: '#6C8CFF',
    words: {
      beginner: [
        ['plane', 'uçak', 'The plane is very big.'],
        ['pilot', 'pilot', 'The pilot says hello.'],
        ['gate', 'biniş kapısı', 'The plane is at gate five.'],
        ['seat', 'koltuk', 'This is your seat.'],
        ['flight', 'uçuş', 'Our flight is at nine.'],
        ['runway', 'pist', 'The plane is on the runway.'],
      ],
      intermediate: [
        ['boarding pass', 'biniş kartı', 'Please show your boarding pass.'],
        ['check-in', 'check-in, uçuş kaydı', 'Check-in closes one hour before the flight.'],
        ['baggage claim', 'bagaj teslim alanı', 'Wait for your bag at baggage claim.'],
        ['security check', 'güvenlik kontrolü', 'Take off your belt at the security check.'],
        ['departure', 'kalkış', 'Departure time is half past two.'],
        ['ground staff', 'yer personeli', 'The ground staff help passengers every day.'],
      ],
      advanced: [
        ['overbooked', 'fazla bilet satılmış', 'The flight is overbooked, so we need volunteers.'],
        ['customs', 'gümrük', 'You must declare this at customs.'],
        ['turnaround', 'iki uçuş arası hazırlık süresi', 'The turnaround took only forty minutes.'],
        ['standby', 'bekleme listesinde', 'She is on standby for the next flight.'],
        ['connecting flight', 'aktarmalı uçuş', "Hurry, or you'll miss your connecting flight."],
        ['prohibited items', 'yasaklı eşyalar', 'Prohibited items are not allowed in hand luggage.'],
      ],
    },
  },
  {
    id: 'office', name: 'Office Life', icon: '💼', color: '#8E7CF0',
    words: {
      beginner: [
        ['office', 'ofis', 'My office is on the third floor.'],
        ['boss', 'patron', 'My boss is very kind.'],
        ['desk', 'çalışma masası', 'My desk is next to the window.'],
        ['email', 'e-posta', 'I write an email to my friend.'],
        ['meeting', 'toplantı', 'We have a meeting at ten.'],
        ['job', 'iş, meslek', 'She loves her job.'],
      ],
      intermediate: [
        ['deadline', 'son teslim tarihi', 'The deadline is next Friday.'],
        ['colleague', 'iş arkadaşı', 'My colleague helped me with the report.'],
        ['schedule', 'program, takvim', 'Let me check my schedule.'],
        ['promotion', 'terfi', 'He got a promotion last year.'],
        ['task', 'görev', 'This task is easy.'],
        ['feedback', 'geri bildirim', 'Thank you for your feedback.'],
      ],
      advanced: [
        ['workload', 'iş yükü', 'My workload is heavy this month.'],
        ['follow up', 'takip etmek', 'I will follow up with the client tomorrow.'],
        ['stakeholder', 'paydaş', 'We need approval from every stakeholder.'],
        ['touch base', 'kısaca görüşmek', "Let's touch base after lunch."],
        ['burnout', 'tükenmişlik', 'Long hours can lead to burnout.'],
        ['streamline', 'sadeleştirmek', 'We want to streamline the process.'],
      ],
    },
  },
  {
    id: 'interviews', name: 'Job Interviews', icon: '🤝', color: '#2EC4A6',
    words: {
      beginner: [
        ['name', 'isim', 'My name is Ada.'],
        ['work', 'çalışmak', 'I work in a bank.'],
        ['team', 'takım', 'I like working in a team.'],
        ['hello', 'merhaba', 'Hello, nice to meet you.'],
        ['good at', '-de iyi olmak', 'I am good at math.'],
        ['help', 'yardım etmek', 'I like to help people.'],
      ],
      intermediate: [
        ['experience', 'deneyim', 'I have three years of experience.'],
        ['skill', 'beceri', 'Communication is an important skill.'],
        ['strength', 'güçlü yön', 'My biggest strength is patience.'],
        ['weakness', 'zayıf yön', 'My weakness is public speaking.'],
        ['salary', 'maaş', 'What is the salary for this role?'],
        ['resume', 'özgeçmiş (CV)', 'I sent my resume yesterday.'],
      ],
      advanced: [
        ['candidate', 'aday', 'She is the strongest candidate.'],
        ['qualifications', 'nitelikler', 'Your qualifications match the job.'],
        ['achievement', 'başarı', 'My biggest achievement was leading the project.'],
        ['negotiate', 'pazarlık etmek', "It's normal to negotiate your salary."],
        ['career goals', 'kariyer hedefleri', 'Tell me about your career goals.'],
        ['hire', 'işe almak', 'They decided to hire me!'],
      ],
    },
  },
  {
    id: 'school', name: 'School & Learning', icon: '📚', color: '#F7B32B',
    words: {
      beginner: [
        ['book', 'kitap', 'I read a book every week.'],
        ['teacher', 'öğretmen', 'Our teacher is funny.'],
        ['pencil', 'kurşun kalem', 'Can I borrow a pencil?'],
        ['class', 'sınıf, ders', 'The class starts at nine.'],
        ['friend', 'arkadaş', 'My best friend sits next to me.'],
        ['homework', 'ödev', 'I do my homework after dinner.'],
      ],
      intermediate: [
        ['exam', 'sınav', 'I have an exam tomorrow.'],
        ['subject', 'ders (konu)', 'My favorite subject is science.'],
        ['grade', 'not', 'I got a good grade in English.'],
        ['library', 'kütüphane', 'We study in the library.'],
        ['notes', 'notlar', 'Can I copy your notes?'],
        ['improve', 'geliştirmek', 'I want to improve my English.'],
      ],
      advanced: [
        ['assignment', 'ödev, proje', 'The assignment is due on Monday.'],
        ['scholarship', 'burs', 'She won a scholarship to study abroad.'],
        ['graduate', 'mezun olmak', 'I will graduate next year.'],
        ['curriculum', 'müfredat', 'The curriculum includes coding.'],
        ['thesis', 'tez', 'He is writing his thesis.'],
        ['fluent', 'akıcı', 'My goal is to be fluent in English.'],
      ],
    },
  },
  {
    id: 'tech', name: 'Software World', icon: '💻', color: '#3D8BFD',
    words: {
      beginner: [
        ['computer', 'bilgisayar', 'I play games on my computer.'],
        ['screen', 'ekran', 'The screen is too bright.'],
        ['click', 'tıklamak', 'Click the blue button.'],
        ['game', 'oyun', 'This game is fun.'],
        ['password', 'şifre', 'Never share your password.'],
        ['app', 'uygulama', 'I use this app every day.'],
      ],
      intermediate: [
        ['bug', 'yazılım hatası', 'We found a bug in the app.'],
        ['update', 'güncelleme', 'Please install the update.'],
        ['feature', 'özellik', 'This feature saves time.'],
        ['database', 'veritabanı', 'The data is stored in a database.'],
        ['release', 'sürüm çıkarmak', 'We release a new version every month.'],
        ['user', 'kullanıcı', 'The user cannot log in.'],
      ],
      advanced: [
        ['deploy', 'canlıya almak', 'We deploy to production on Thursdays.'],
        ['refactor', 'kodu yeniden düzenlemek', "Let's refactor this function."],
        ['backlog', 'bekleyen iş listesi', 'Add the task to the backlog.'],
        ['scalable', 'ölçeklenebilir', 'The system must be scalable.'],
        ['code review', 'kod incelemesi', 'My code review found two issues.'],
        ['troubleshoot', 'sorunu bulup çözmek', 'I need to troubleshoot the server.'],
      ],
    },
  },
  {
    id: 'hobbies', name: 'Hobbies', icon: '🎨', color: '#FF7EB6',
    words: {
      beginner: [
        ['draw', 'çizmek', 'I like to draw cats.'],
        ['sing', 'şarkı söylemek', 'We sing in the car.'],
        ['dance', 'dans etmek', 'My sister can dance very well.'],
        ['read', 'okumak', 'I read comics at night.'],
        ['play', 'oynamak', "Let's play outside."],
        ['paint', 'boyamak, resim yapmak', 'I paint pictures of flowers.'],
      ],
      intermediate: [
        ['knit', 'örgü örmek', 'My aunt taught me to knit.'],
        ['photography', 'fotoğrafçılık', 'Photography is my new hobby.'],
        ['hiking', 'doğa yürüyüşü', 'We go hiking in the mountains.'],
        ['collect', 'biriktirmek', 'I collect old coins.'],
        ['gardening', 'bahçe işleri', 'Gardening helps me relax.'],
        ['board game', 'kutu oyunu', 'We played a board game all evening.'],
      ],
      advanced: [
        ['take up', '(bir hobiye) başlamak', 'I want to take up yoga.'],
        ['pastime', 'boş zaman uğraşı', 'Reading is my favorite pastime.'],
        ['passionate', 'tutkulu', 'He is passionate about chess.'],
        ['unwind', 'kafa dinlemek', 'I unwind by playing the guitar.'],
        ['amateur', 'amatör', 'She is an amateur photographer.'],
        ['hands-on', 'uygulamalı, elle yapılan', 'I prefer hands-on hobbies like pottery.'],
      ],
    },
  },
  {
    id: 'nature', name: 'Nature & Weather', icon: '🌿', color: '#4CC764',
    words: {
      beginner: [
        ['sun', 'güneş', 'The sun is hot today.'],
        ['rain', 'yağmur', 'I like the sound of rain.'],
        ['tree', 'ağaç', 'There is a bird in the tree.'],
        ['flower', 'çiçek', 'This flower smells nice.'],
        ['snow', 'kar', 'We play in the snow.'],
        ['sky', 'gökyüzü', 'The sky is blue.'],
      ],
      intermediate: [
        ['forest', 'orman', 'We walked through the forest.'],
        ['storm', 'fırtına', 'A big storm is coming.'],
        ['cloudy', 'bulutlu', 'It is cloudy this morning.'],
        ['lake', 'göl', 'We swam in the lake.'],
        ['season', 'mevsim', 'Spring is my favorite season.'],
        ['temperature', 'sıcaklık', 'The temperature is twenty degrees.'],
      ],
      advanced: [
        ['environment', 'çevre', 'We must protect the environment.'],
        ['drought', 'kuraklık', 'The drought hurt the farmers.'],
        ['breathtaking', 'nefes kesici', 'The view from the hill was breathtaking.'],
        ['humid', 'nemli', 'Istanbul is humid in summer.'],
        ['climate change', 'iklim değişikliği', 'Climate change affects everyone.'],
        ['scenery', 'manzara', 'The scenery in Cappadocia is amazing.'],
      ],
    },
  },
  {
    id: 'animals', name: 'Animals', icon: '🐾', color: '#C98B5B',
    words: {
      beginner: [
        ['cat', 'kedi', 'My cat sleeps all day.'],
        ['dog', 'köpek', 'The dog runs in the park.'],
        ['bird', 'kuş', 'A bird is singing.'],
        ['fish', 'balık', 'The fish is orange.'],
        ['horse', 'at', 'The horse is very fast.'],
        ['rabbit', 'tavşan', 'The rabbit eats carrots.'],
      ],
      intermediate: [
        ['wild', 'vahşi', 'Lions are wild animals.'],
        ['tail', 'kuyruk', 'The dog wags its tail.'],
        ['feather', 'tüy (kuş)', 'I found a blue feather.'],
        ['pet', 'evcil hayvan', 'Do you have a pet?'],
        ['feed', 'beslemek', 'I feed my fish every morning.'],
        ['nest', 'kuş yuvası', 'The bird built a nest.'],
      ],
      advanced: [
        ['endangered', 'nesli tükenmekte olan', 'Some sea turtles are endangered.'],
        ['habitat', 'yaşam alanı', 'The forest is their natural habitat.'],
        ['predator', 'yırtıcı hayvan', 'The eagle is a predator.'],
        ['herd', 'sürü', 'A herd of goats crossed the road.'],
        ['adopt', 'sahiplenmek', 'We want to adopt a cat from the shelter.'],
        ['migrate', 'göç etmek', 'Storks migrate in autumn.'],
      ],
    },
  },
  {
    id: 'feelings', name: 'Feelings & People', icon: '💛', color: '#FFC23D',
    words: {
      beginner: [
        ['happy', 'mutlu', 'I am happy today.'],
        ['sad', 'üzgün', 'The boy is sad.'],
        ['angry', 'kızgın', "Don't be angry with me."],
        ['tired', 'yorgun', 'I am tired after school.'],
        ['scared', 'korkmuş', 'I am scared of the dark.'],
        ['love', 'sevmek', 'I love my family.'],
      ],
      intermediate: [
        ['nervous', 'gergin', 'I feel nervous before exams.'],
        ['proud', 'gururlu', 'My mom is proud of me.'],
        ['lonely', 'yalnız', 'He feels lonely in the new city.'],
        ['excited', 'heyecanlı', "I'm excited about the trip."],
        ['jealous', 'kıskanç', 'She was jealous of her sister.'],
        ['grateful', 'minnettar', "I'm grateful for your help."],
      ],
      advanced: [
        ['overwhelmed', 'bunalmış', 'I feel overwhelmed by work.'],
        ['relieved', 'rahatlamış', 'I was relieved when I passed.'],
        ['frustrated', 'sinirlenmiş, bıkmış', 'He got frustrated with the slow internet.'],
        ['empathy', 'empati', 'Empathy makes us better friends.'],
        ['embarrassed', 'utanmış, mahcup', 'I was embarrassed when I fell.'],
        ['content', 'halinden memnun', 'She is content with her simple life.'],
      ],
    },
  },
  {
    id: 'music', name: 'Music & Manifest', icon: '🎤', color: '#E259C8',
    words: {
      beginner: [
        ['music', 'müzik', 'I listen to music every day.'],
        ['band', 'müzik grubu', 'Manifest is my favorite band.'],
        ['stage', 'sahne', 'The singers are on the stage.'],
        ['fan', 'hayran', 'I am a big fan of Manifest.'],
        ['loud', 'yüksek sesli', 'The music is very loud.'],
        ['star', 'yıldız', 'She wants to be a pop star.'],
      ],
      intermediate: [
        ['concert', 'konser', 'We went to a Manifest concert.'],
        ['lyrics', 'şarkı sözleri', 'I know all the lyrics by heart.'],
        ['album', 'albüm', 'Their new album is out.'],
        ['choreography', 'koreografi', 'The choreography is hard to learn.'],
        ['rehearsal', 'prova', 'They have a rehearsal before the show.'],
        ['chart', 'müzik listesi', 'The song is number one on the chart.'],
      ],
      advanced: [
        ['debut', 'ilk çıkış', 'The group made their debut on TV.'],
        ['catchy', 'akılda kalıcı', 'The chorus is really catchy.'],
        ['fandom', 'hayran kitlesi', 'Their fandom is growing fast.'],
        ['sold out', 'biletleri tükenmiş', 'The concert was sold out in minutes.'],
        ['music video', 'klip', 'The music video has millions of views.'],
        ['perform', 'sahne almak', 'They perform in a different city each week.'],
      ],
    },
  },
  {
    id: 'sports', name: 'Sports & Health', icon: '⚽', color: '#FF6B5B',
    words: {
      beginner: [
        ['ball', 'top', 'Kick the ball!'],
        ['run', 'koşmak', 'I run in the park.'],
        ['swim', 'yüzmek', 'I can swim very fast.'],
        ['win', 'kazanmak', 'Our team will win!'],
        ['jump', 'zıplamak', 'The kids jump on the bed.'],
        ['healthy', 'sağlıklı', 'Vegetables are healthy.'],
      ],
      intermediate: [
        ['coach', 'antrenör', 'Our coach is strict.'],
        ['match', 'maç', 'The match starts at eight.'],
        ['injury', 'sakatlık', 'He has a knee injury.'],
        ['score', 'skor', 'What is the score now?'],
        ['gym', 'spor salonu', 'I go to the gym three times a week.'],
        ['warm up', 'ısınmak', 'Always warm up before you run.'],
      ],
      advanced: [
        ['endurance', 'dayanıklılık', 'Marathons need endurance.'],
        ['referee', 'hakem', 'The referee gave a red card.'],
        ['tournament', 'turnuva', 'Our team won the tournament.'],
        ['work out', 'egzersiz yapmak', 'I work out before breakfast.'],
        ['competitive', 'rekabetçi', 'She is very competitive.'],
        ['recover', 'iyileşmek, toparlanmak', 'It takes time to recover from an injury.'],
      ],
    },
  },
  {
    id: 'movies', name: 'Movies & Series', icon: '🎬', color: '#5B6CFF',
    words: {
      beginner: [
        ['movie', 'film', "Let's watch a movie."],
        ['funny', 'komik', 'This cartoon is funny.'],
        ['hero', 'kahraman', 'The hero saves the city.'],
        ['popcorn', 'patlamış mısır', 'I love popcorn at the cinema.'],
        ['watch', 'izlemek', 'We watch TV after dinner.'],
        ['scary', 'korkutucu', 'That film was too scary.'],
      ],
      intermediate: [
        ['episode', 'bölüm', 'I watched the first episode.'],
        ['series', 'dizi', 'This series has five seasons.'],
        ['actor', 'aktör', 'He is my favorite actor.'],
        ['plot', 'olay örgüsü', 'The plot is very exciting.'],
        ['subtitles', 'altyazı', 'I watch with English subtitles.'],
        ['trailer', 'fragman', 'The trailer looks amazing.'],
      ],
      advanced: [
        ['binge-watch', 'ardı ardına izlemek', "Let's binge-watch the new season."],
        ['spoiler', 'sürprizi bozan bilgi', 'No spoiler, please!'],
        ['cliffhanger', 'merakta bırakan son', 'The episode ended on a cliffhanger.'],
        ['cast', 'oyuncu kadrosu', 'The cast is incredible.'],
        ['sequel', 'devam filmi', 'The sequel is better than the first film.'],
        ['critically acclaimed', 'eleştirmenlerce beğenilen', "It's a critically acclaimed drama."],
      ],
    },
  },
  {
    id: 'shopping', name: 'Shopping & Money', icon: '🛍️', color: '#00B8A9',
    words: {
      beginner: [
        ['money', 'para', 'I have some money.'],
        ['shop', 'dükkân', 'The shop is open.'],
        ['buy', 'satın almak', 'I want to buy a toy.'],
        ['cheap', 'ucuz', 'This shirt is cheap.'],
        ['expensive', 'pahalı', 'That car is expensive.'],
        ['shoes', 'ayakkabı', 'I need new shoes.'],
      ],
      intermediate: [
        ['discount', 'indirim', 'There is a twenty percent discount.'],
        ['receipt', 'fiş', 'Keep the receipt, please.'],
        ['try on', 'denemek (kıyafet)', 'Can I try on this jacket?'],
        ['cash', 'nakit', 'Do you pay by card or cash?'],
        ['size', 'beden', 'Do you have this in a smaller size?'],
        ['refund', 'para iadesi', 'I asked for a refund.'],
      ],
      advanced: [
        ['bargain', 'kelepir', 'This sofa was a real bargain.'],
        ['budget', 'bütçe', 'We need to stay on budget.'],
        ['installment', 'taksit', 'I paid the first installment today.'],
        ['impulse buy', 'anlık satın alma', 'These shoes were an impulse buy.'],
        ['out of stock', 'stokta yok', "Sorry, it's out of stock."],
        ['warranty', 'garanti', 'The laptop has a two-year warranty.'],
      ],
    },
  },
]

export const PICK_COUNT = 5

// The player's own words live on a bonus island next to the harbor.
export const CUSTOM_TOPIC = { id: 'custom', name: 'My Island', icon: '⭐', color: '#FFB703' }

export const topicById = (id) => (id === CUSTOM_TOPIC.id ? CUSTOM_TOPIC : TOPICS.find((t) => t.id === id))

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Flat list of every built-in word with a stable id.
export const ALL_WORDS = TOPICS.flatMap((topic) =>
  LEVELS.flatMap((level) =>
    topic.words[level.id].map(([en, tr, ex]) => ({
      id: `${topic.id}.${level.id}.${slug(en)}`,
      en,
      tr,
      ex,
      topic: topic.id,
      level: level.id,
    })),
  ),
)

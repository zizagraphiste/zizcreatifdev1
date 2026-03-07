
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Trigger: auto-create profile + member role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT,
  type TEXT CHECK (type IN ('guide', 'masterclass', 'app')),
  price INTEGER NOT NULL, currency TEXT DEFAULT 'XOF',
  max_spots INTEGER NOT NULL, spots_taken INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  delivery_mode TEXT DEFAULT 'auto' CHECK (delivery_mode IN ('auto', 'scheduled')),
  delivery_date TIMESTAMPTZ, thumbnail_emoji TEXT DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can do anything with products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Registrations table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  email TEXT NOT NULL, full_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'rejected')),
  payment_screenshot_url TEXT, payment_ref TEXT, wave_checkout_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), confirmed_at TIMESTAMPTZ
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own registrations" ON public.registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create registrations" ON public.registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all registrations" ON public.registrations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Access grants table
CREATE TABLE public.access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  available_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own grants" ON public.access_grants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage grants" ON public.access_grants FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('pdf', 'html5', 'link')),
  file_path TEXT, external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage resources" ON public.resources FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users with access can view resources" ON public.resources FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.user_id = auth.uid() AND ag.product_id = resources.product_id
    AND (ag.available_at IS NULL OR ag.available_at <= now())
    AND (ag.expires_at IS NULL OR ag.expires_at > now())
  )
);

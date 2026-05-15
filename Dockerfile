FROM nginx:alpine

# копируем сайт
COPY . /usr/share/nginx/html

# копируем готовый nginx-конфиг (без шаблонов и envsubst)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# чистим мусор и старый default
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/nginx.conf.template

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

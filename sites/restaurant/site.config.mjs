// GENERATED from packages/core/test/fixtures, do not hand-edit.
// Regenerate: UPDATE_CONFIGS=1 npx vitest run packages/core/test/site-configs.test.ts
// Shape: pure data, pack referenced by id. This is what agents author.
export default {
  "pack": "restaurant",
  "target": "cloudflare",
  "spec": {
    "specVersion": "0-1-0",
    "pack": {
      "id": "restaurant",
      "version": "0-1-0"
    },
    "meta": {
      "lang": "en",
      "title": {
        "kind": "copy",
        "value": "Rosalia's Kitchen — Italian in Sunnyvale"
      },
      "description": {
        "kind": "copy",
        "value": "Family-run Italian kitchen in downtown Sunnyvale. Fresh pasta, wood-fired classics, and a warm room."
      }
    },
    "theme": {
      "palette": {
        "background": "#faf6f0",
        "surface": "#ffffff",
        "text": "#2b2420",
        "textMuted": "#6f655c",
        "primary": "#b4541f",
        "primaryText": "#ffffff",
        "accent": "#2f6b4f",
        "border": "#e7ddd1"
      },
      "typography": {
        "headingFamily": "'Fraunces', Georgia, 'Times New Roman', serif",
        "bodyFamily": "'Source Sans 3', system-ui, -apple-system, sans-serif",
        "baseSizePx": 18,
        "scaleRatio": 1.25,
        "headingWeight": 600,
        "bodyWeight": 400
      },
      "spacing": {
        "unitPx": 8,
        "scale": [
          0,
          0.5,
          1,
          1.5,
          2,
          3,
          4,
          6,
          8
        ]
      },
      "radiusPx": 10,
      "fontImportUrl": "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Source+Sans+3:wght@400;600&display=swap"
    },
    "sections": [
      {
        "id": "hero-01",
        "type": "hero",
        "version": "0-1-0",
        "content": {
          "businessName": {
            "kind": "fact",
            "value": "Rosalia's Kitchen",
            "source": "business.name"
          },
          "headline": {
            "kind": "copy",
            "value": "Fresh pasta, made by hand every morning."
          },
          "subhead": {
            "kind": "copy",
            "value": "A family-run Italian kitchen in downtown Sunnyvale."
          },
          "cta": {
            "label": {
              "kind": "copy",
              "value": "See the menu"
            },
            "href": "#menu"
          }
        }
      },
      {
        "id": "menu-01",
        "type": "menu",
        "version": "0-1-0",
        "content": {
          "heading": {
            "kind": "copy",
            "value": "Our menu"
          },
          "categories": [
            {
              "name": {
                "kind": "fact",
                "value": "Antipasti",
                "source": "menu.categories.0.name"
              },
              "items": [
                {
                  "name": {
                    "kind": "fact",
                    "value": "Bruschetta",
                    "source": "menu.categories.0.items.0.name"
                  },
                  "price": {
                    "kind": "fact",
                    "value": "$9",
                    "source": "menu.categories.0.items.0.price"
                  },
                  "description": {
                    "kind": "copy",
                    "value": "Grilled bread, San Marzano tomato, basil."
                  }
                },
                {
                  "name": {
                    "kind": "fact",
                    "value": "Burrata",
                    "source": "menu.categories.0.items.1.name"
                  },
                  "price": {
                    "kind": "fact",
                    "value": "$14",
                    "source": "menu.categories.0.items.1.price"
                  },
                  "description": {
                    "kind": "copy",
                    "value": "Creamy burrata, olive oil, sea salt."
                  }
                }
              ]
            },
            {
              "name": {
                "kind": "fact",
                "value": "Pasta",
                "source": "menu.categories.1.name"
              },
              "items": [
                {
                  "name": {
                    "kind": "fact",
                    "value": "Cacio e Pepe",
                    "source": "menu.categories.1.items.0.name"
                  },
                  "price": {
                    "kind": "fact",
                    "value": "$19",
                    "source": "menu.categories.1.items.0.price"
                  }
                },
                {
                  "name": {
                    "kind": "fact",
                    "value": "Lasagna della Nonna",
                    "source": "menu.categories.1.items.1.name"
                  },
                  "price": {
                    "kind": "fact",
                    "value": "$22",
                    "source": "menu.categories.1.items.1.price"
                  },
                  "description": {
                    "kind": "copy",
                    "value": "Twelve layers, slow-cooked ragù."
                  }
                }
              ]
            }
          ]
        }
      },
      {
        "id": "hours-01",
        "type": "hours",
        "version": "0-1-0",
        "content": {
          "heading": {
            "kind": "copy",
            "value": "Hours"
          },
          "days": [
            {
              "day": {
                "kind": "fact",
                "value": "Monday",
                "source": "hours.0.day"
              },
              "closed": true
            },
            {
              "day": {
                "kind": "fact",
                "value": "Tuesday",
                "source": "hours.1.day"
              },
              "open": {
                "kind": "fact",
                "value": "11:30 AM",
                "source": "hours.1.open"
              },
              "close": {
                "kind": "fact",
                "value": "9:00 PM",
                "source": "hours.1.close"
              }
            },
            {
              "day": {
                "kind": "fact",
                "value": "Wednesday",
                "source": "hours.2.day"
              },
              "open": {
                "kind": "fact",
                "value": "11:30 AM",
                "source": "hours.2.open"
              },
              "close": {
                "kind": "fact",
                "value": "9:00 PM",
                "source": "hours.2.close"
              }
            },
            {
              "day": {
                "kind": "fact",
                "value": "Thursday",
                "source": "hours.3.day"
              },
              "open": {
                "kind": "fact",
                "value": "11:30 AM",
                "source": "hours.3.open"
              },
              "close": {
                "kind": "fact",
                "value": "9:00 PM",
                "source": "hours.3.close"
              }
            },
            {
              "day": {
                "kind": "fact",
                "value": "Friday",
                "source": "hours.4.day"
              },
              "open": {
                "kind": "fact",
                "value": "11:30 AM",
                "source": "hours.4.open"
              },
              "close": {
                "kind": "fact",
                "value": "10:00 PM",
                "source": "hours.4.close"
              }
            },
            {
              "day": {
                "kind": "fact",
                "value": "Saturday",
                "source": "hours.5.day"
              },
              "open": {
                "kind": "fact",
                "value": "10:00 AM",
                "source": "hours.5.open"
              },
              "close": {
                "kind": "fact",
                "value": "10:00 PM",
                "source": "hours.5.close"
              }
            },
            {
              "day": {
                "kind": "fact",
                "value": "Sunday",
                "source": "hours.6.day"
              },
              "open": {
                "kind": "fact",
                "value": "10:00 AM",
                "source": "hours.6.open"
              },
              "close": {
                "kind": "fact",
                "value": "8:00 PM",
                "source": "hours.6.close"
              }
            }
          ]
        }
      },
      {
        "id": "reviews-01",
        "type": "reviews",
        "version": "0-1-0",
        "content": {
          "heading": {
            "kind": "copy",
            "value": "What people say"
          },
          "items": [
            {
              "author": {
                "kind": "fact",
                "value": "Maria G.",
                "source": "reviews.0.author"
              },
              "rating": {
                "kind": "fact",
                "value": 5,
                "source": "reviews.0.rating"
              },
              "text": {
                "kind": "fact",
                "value": "Tastes like my grandmother's cooking. Unreal.",
                "source": "reviews.0.text"
              },
              "source": {
                "kind": "fact",
                "value": "Google",
                "source": "reviews.0.source"
              }
            },
            {
              "author": {
                "kind": "fact",
                "value": "Devin R.",
                "source": "reviews.1.author"
              },
              "rating": {
                "kind": "fact",
                "value": 5,
                "source": "reviews.1.rating"
              },
              "text": {
                "kind": "fact",
                "value": "The lasagna alone is worth the drive.",
                "source": "reviews.1.text"
              },
              "source": {
                "kind": "fact",
                "value": "Yelp",
                "source": "reviews.1.source"
              }
            }
          ]
        }
      },
      {
        "id": "contact-01",
        "type": "contact",
        "version": "0-1-0",
        "content": {
          "heading": {
            "kind": "copy",
            "value": "Find us"
          },
          "address": {
            "kind": "fact",
            "value": "118 S Murphy Ave, Sunnyvale, CA 94086",
            "source": "business.address"
          },
          "phone": {
            "kind": "fact",
            "value": "+14085550142",
            "source": "business.phone"
          },
          "email": {
            "kind": "fact",
            "value": "hello@rosalias.example",
            "source": "business.email"
          },
          "cta": {
            "label": {
              "kind": "copy",
              "value": "Call to reserve"
            },
            "href": "tel:+14085550142"
          }
        }
      }
    ]
  },
  "brief": {
    "business": {
      "name": "Rosalia's Kitchen",
      "category": "Italian restaurant",
      "phone": "+14085550142",
      "email": "hello@rosalias.example",
      "address": "118 S Murphy Ave, Sunnyvale, CA 94086",
      "country": "US"
    },
    "hours": [
      {
        "day": "Monday",
        "closed": true
      },
      {
        "day": "Tuesday",
        "open": "11:30 AM",
        "close": "9:00 PM"
      },
      {
        "day": "Wednesday",
        "open": "11:30 AM",
        "close": "9:00 PM"
      },
      {
        "day": "Thursday",
        "open": "11:30 AM",
        "close": "9:00 PM"
      },
      {
        "day": "Friday",
        "open": "11:30 AM",
        "close": "10:00 PM"
      },
      {
        "day": "Saturday",
        "open": "10:00 AM",
        "close": "10:00 PM"
      },
      {
        "day": "Sunday",
        "open": "10:00 AM",
        "close": "8:00 PM"
      }
    ],
    "menu": {
      "categories": [
        {
          "name": "Antipasti",
          "items": [
            {
              "name": "Bruschetta",
              "price": "$9",
              "desc": "Grilled bread, San Marzano tomato, basil."
            },
            {
              "name": "Burrata",
              "price": "$14",
              "desc": "Creamy burrata, olive oil, sea salt."
            }
          ]
        },
        {
          "name": "Pasta",
          "items": [
            {
              "name": "Cacio e Pepe",
              "price": "$19"
            },
            {
              "name": "Lasagna della Nonna",
              "price": "$22",
              "desc": "Twelve layers, slow-cooked ragù."
            }
          ]
        }
      ]
    },
    "reviews": [
      {
        "author": "Maria G.",
        "rating": 5,
        "text": "Tastes like my grandmother's cooking. Unreal.",
        "source": "Google"
      },
      {
        "author": "Devin R.",
        "rating": 5,
        "text": "The lasagna alone is worth the drive.",
        "source": "Yelp"
      }
    ]
  },
  "site": {
    "baseUrl": "https://rosalias.example",
    "path": "/",
    "locales": [
      "en",
      "es"
    ],
    "defaultLocale": "en",
    "ogImage": "https://rosalias.example/og.png"
  }
};
